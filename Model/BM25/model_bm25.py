"""
Model 1: BM25 baseline using the preprocessed HuggingFace dataset.

This version does not preprocess the whole training corpus locally. It loads the
`tfidf` config from `ynguyen1010/medical_vietnamese_datasets`, then fits a BM25
retriever on the already-preprocessed `question_processed` column.
"""

import re
import unicodedata
import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

try:
    from underthesea import word_tokenize

    VIETNAMESE_SUPPORT = True
except ImportError:
    word_tokenize = None
    VIETNAMESE_SUPPORT = False


HF_REPO_ID = "ynguyen1010/medical_vietnamese_datasets"
HF_CONFIG_NAME = "tfidf"
HF_SPLIT = "train"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts" / "model_bm25"


# Stopwords must match the preprocessing notebook as closely as possible.
VIETNAMESE_STOPWORDS = {
    "tôi", "bạn", "mình", "chúng", "ta", "nó", "họ", "hắn", "cô", "anh",
    "chị", "em", "ông", "bà", "cháu", "con", "đây", "đó", "này", "kia",
    "ấy", "và", "hoặc", "hay", "nhưng", "mà", "vì", "nên", "do", "nếu",
    "thì", "với", "từ", "đến", "trong", "ngoài", "trên", "dưới", "về",
    "theo", "tại", "ở", "của", "cho", "cùng", "như", "giữa", "sau",
    "trước", "vào", "ra", "lên", "xuống", "qua", "sang", "là", "có",
    "được", "không", "cũng", "rất", "còn", "đã", "đang", "sẽ", "cần",
    "phải", "hãy", "đừng", "chưa", "mới", "lại", "vẫn", "hơn", "nhất",
    "ít", "nhiều", "cả", "mỗi", "một", "các", "những", "ai", "gì",
    "nào", "sao", "thế", "vậy", "thôi", "ạ", "hai", "ba", "bốn", "năm",
    "sáu", "bảy", "tám", "chín", "mười", "thứ", "lần", "lượt", "khi",
    "lúc", "ngày", "tháng", "hôm", "nay", "tuần", "giờ", "ơi", "nhé",
    "nha", "giúp", "tư vấn", "cho hỏi", "xin hỏi", "muốn biết", "thắc mắc",
}

URL_PATTERN = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"\S+@\S+\.\S+")
PHONE_PATTERN = re.compile(r"(?<![\d])(?:\+84|0)(?:\d[\s.-]?){8,9}(?![\d])")
HTML_TAG_PATTERN = re.compile(r"<[^>]+>")
MULTI_SPACE = re.compile(r"\s+")
ALLOWED_MEDICAL_PUNCT = set(".,;:/%()-")


def normalize_unicode(text: str) -> str:
    """Normalize Vietnamese text to NFC."""
    return unicodedata.normalize("NFC", text) if isinstance(text, str) else ""


def keep_medical_chars(text: str) -> str:
    """Keep letters, numbers, whitespace, and punctuation useful in medical text."""
    chars = []
    for char in text:
        category = unicodedata.category(char)
        if char.isspace() or char in ALLOWED_MEDICAL_PUNCT:
            chars.append(char)
        elif category.startswith("L") or category.startswith("N"):
            chars.append(char)
        else:
            chars.append(" ")
    return "".join(chars)


def clean_text(text: str) -> str:
    """Clean raw text using the same intent as preprocessing_model1_tfidf.ipynb."""
    if not isinstance(text, str):
        return ""

    text = normalize_unicode(text)
    text = HTML_TAG_PATTERN.sub(" ", text)
    text = URL_PATTERN.sub(" ", text)
    text = EMAIL_PATTERN.sub(" ", text)
    text = PHONE_PATTERN.sub(" ", text)
    text = keep_medical_chars(text)
    text = MULTI_SPACE.sub(" ", text)
    return text.strip().lower()


def segment_words(text: str) -> str:
    """
    Segment Vietnamese text and join multi-syllable words with underscores.

    The HuggingFace `tfidf` dataset was created with this convention, so query
    preprocessing must use it too for good retrieval quality.
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    if not VIETNAMESE_SUPPORT:
        return text

    try:
        tokens = word_tokenize(text, format="list")
    except Exception:
        return text

    return " ".join(token.replace(" ", "_") for token in tokens)


def remove_stopwords(text: str, stopwords: set = VIETNAMESE_STOPWORDS) -> str:
    """Remove Vietnamese stopwords from segmented text."""
    if not isinstance(text, str):
        return ""

    tokens = text.split()
    filtered = [
        token
        for token in tokens
        if token.replace("_", " ") not in stopwords and len(token) > 1
    ]
    return " ".join(filtered)


def preprocess_query(text: str) -> str:
    """Clean, segment, and remove stopwords from a user query."""
    text = clean_text(text)
    text = segment_words(text)
    return remove_stopwords(text)


def whitespace_tokenize(text: str) -> List[str]:
    """Tokenize preprocessed text by spaces."""
    return text.split() if isinstance(text, str) else []


def load_preprocessed_hf_dataset(
    repo_id: str = HF_REPO_ID,
    config_name: str = HF_CONFIG_NAME,
    split: str = HF_SPLIT,
) -> pd.DataFrame:
    """
    Load the preprocessed dataset from HuggingFace.

    Required columns:
    - question_cleaned
    - answer_cleaned
    - question_processed
    - answer_processed
    """
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise ImportError(
            "Missing dependency `datasets`. Install it with: pip install datasets"
        ) from exc

    dataset = load_dataset(repo_id, name=config_name, split=split)
    df = dataset.to_pandas()

    required_columns = {
        "question_cleaned",
        "answer_cleaned",
        "question_processed",
        "answer_processed",
    }
    missing_columns = required_columns.difference(df.columns)
    if missing_columns:
        raise ValueError(
            f"HuggingFace dataset is missing columns: {sorted(missing_columns)}"
        )

    return df


class BM25Retriever:
    """BM25 retriever over already-preprocessed documents."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: List[str] = []
        self.tokenized_docs: List[List[str]] = []
        self.term_freqs: List[Counter] = []
        self.doc_freqs: Dict[str, int] = defaultdict(int)
        self.idf: Dict[str, float] = {}
        self.doc_lengths: List[int] = []
        self.avg_doc_length = 0.0
        self.num_docs = 0

    def fit(self, documents: List[str], tokenizer=whitespace_tokenize) -> None:
        self.documents = [doc if isinstance(doc, str) else "" for doc in documents]
        self.num_docs = len(self.documents)
        self.tokenized_docs = [tokenizer(doc) for doc in self.documents]
        self.term_freqs = [Counter(tokens) for tokens in self.tokenized_docs]
        self.doc_lengths = [len(tokens) for tokens in self.tokenized_docs]
        self.doc_freqs = defaultdict(int)
        self.idf = {}

        for term_freq in self.term_freqs:
            for token in term_freq.keys():
                self.doc_freqs[token] += 1

        self.avg_doc_length = (
            sum(self.doc_lengths) / self.num_docs if self.num_docs > 0 else 0.0
        )

        for token, df in self.doc_freqs.items():
            self.idf[token] = float(
                np.log((self.num_docs - df + 0.5) / (df + 0.5) + 1.0)
            )

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        tokenizer=whitespace_tokenize,
    ) -> List[Tuple[int, float]]:
        if self.num_docs == 0:
            raise RuntimeError("BM25Retriever must be fitted before retrieve().")
        if self.avg_doc_length == 0:
            return [(idx, 0.0) for idx in range(min(top_k, self.num_docs))]

        query_tokens = set(tokenizer(query))
        scores = np.zeros(self.num_docs, dtype=np.float64)

        for token in query_tokens:
            if token not in self.idf:
                continue

            idf_score = self.idf[token]
            for doc_idx, term_freq in enumerate(self.term_freqs):
                freq = term_freq.get(token, 0)
                if freq == 0:
                    continue

                doc_length = self.doc_lengths[doc_idx]
                numerator = freq * (self.k1 + 1.0)
                denominator = freq + self.k1 * (
                    1.0 - self.b + self.b * (doc_length / self.avg_doc_length)
                )
                scores[doc_idx] += idf_score * (numerator / denominator)

        top_indices = np.argsort(scores)[-top_k:][::-1]
        return [(int(idx), float(scores[idx])) for idx in top_indices]


@dataclass
class SearchResult:
    index: int
    score: float
    question: str
    answer: str
    question_processed: str


class MedicalModel1HF:
    """
    End-to-end BM25 retriever using the preprocessed HuggingFace dataset.

    Default behavior:
    - Load `ynguyen1010/medical_vietnamese_datasets`, config `tfidf`
    - Index `question_processed`
    - Return the matching `answer_cleaned`
    """

    def __init__(
        self,
        repo_id: str = HF_REPO_ID,
        config_name: str = HF_CONFIG_NAME,
        split: str = HF_SPLIT,
        index_column: str = "question_processed",
        question_column: str = "question_cleaned",
        answer_column: str = "answer_cleaned",
    ):
        self.repo_id = repo_id
        self.config_name = config_name
        self.split = split
        self.index_column = index_column
        self.question_column = question_column
        self.answer_column = answer_column
        self.method = "bm25"

        self.df: Optional[pd.DataFrame] = None
        self.documents: List[str] = []
        self.retriever: Optional[BM25Retriever] = None

    def load_data(self) -> pd.DataFrame:
        self.df = load_preprocessed_hf_dataset(
            repo_id=self.repo_id,
            config_name=self.config_name,
            split=self.split,
        )
        return self.df

    def fit(self, df: Optional[pd.DataFrame] = None) -> None:
        self.df = df.copy() if df is not None else self.load_data()

        for column in [self.index_column, self.question_column, self.answer_column]:
            if column not in self.df.columns:
                raise ValueError(f"Column `{column}` not found in dataset.")

        self.df = self.df.dropna(subset=[self.index_column]).reset_index(drop=True)
        self.documents = self.df[self.index_column].fillna("").astype(str).tolist()

        self.retriever = BM25Retriever()
        self.retriever.fit(self.documents)

    def save_artifacts(self, artifact_dir: Path | str = DEFAULT_ARTIFACT_DIR) -> Path:
        """
        Save processed data and fitted BM25 index to local disk.

        Files created:
        - metadata.json: model and dataset settings
        - processed_data.pkl: HuggingFace data used by the model
        - bm25_retriever.joblib: fitted BM25 index
        """
        if self.df is None or self.retriever is None:
            raise RuntimeError("Model must be fitted before save_artifacts().")

        artifact_path = Path(artifact_dir)
        artifact_path.mkdir(parents=True, exist_ok=True)

        self.df.to_pickle(artifact_path / "processed_data.pkl")

        metadata = {
            "repo_id": self.repo_id,
            "config_name": self.config_name,
            "split": self.split,
            "index_column": self.index_column,
            "question_column": self.question_column,
            "answer_column": self.answer_column,
            "method": self.method,
            "num_rows": int(len(self.df)),
            "num_documents": int(len(self.documents)),
            "bm25_vocabulary_size": int(len(self.retriever.idf)),
        }

        joblib.dump(self.retriever, artifact_path / "bm25_retriever.joblib")

        with (artifact_path / "metadata.json").open("w", encoding="utf-8") as file:
            json.dump(metadata, file, ensure_ascii=False, indent=2)

        return artifact_path

    @classmethod
    def load_artifacts(cls, artifact_dir: Path | str = DEFAULT_ARTIFACT_DIR) -> "MedicalModel1HF":
        """Load processed data and fitted BM25 index from local disk."""
        artifact_path = Path(artifact_dir)
        metadata_path = artifact_path / "metadata.json"
        data_path = artifact_path / "processed_data.pkl"
        bm25_path = artifact_path / "bm25_retriever.joblib"

        if not metadata_path.exists() or not data_path.exists() or not bm25_path.exists():
            raise FileNotFoundError(
                f"Cannot find saved artifacts in `{artifact_path}`. "
                "Run the script once without --load-local to build them."
            )

        with metadata_path.open("r", encoding="utf-8") as file:
            metadata = json.load(file)

        model = cls(
            repo_id=metadata.get("repo_id", HF_REPO_ID),
            config_name=metadata.get("config_name", HF_CONFIG_NAME),
            split=metadata.get("split", HF_SPLIT),
            index_column=metadata.get("index_column", "question_processed"),
            question_column=metadata.get("question_column", "question_cleaned"),
            answer_column=metadata.get("answer_column", "answer_cleaned"),
        )

        saved_method = metadata.get("method", "bm25")
        if saved_method != "bm25":
            raise ValueError(f"Saved artifact method must be `bm25`, got `{saved_method}`.")

        model.df = pd.read_pickle(data_path)
        model.documents = model.df[model.index_column].fillna("").astype(str).tolist()

        main_module = sys.modules.get("__main__")
        if main_module is not None:
            setattr(main_module, "BM25Retriever", BM25Retriever)

        model.retriever = joblib.load(bm25_path)

        return model

    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        if self.retriever is None or self.df is None:
            raise RuntimeError("Model must be fitted before search().")

        processed_query = preprocess_query(query)
        results = self.retriever.retrieve(processed_query, top_k=top_k)

        search_results: List[SearchResult] = []
        for idx, score in results:
            row = self.df.iloc[idx]
            search_results.append(
                SearchResult(
                    index=idx,
                    score=score,
                    question=str(row[self.question_column]),
                    answer=str(row[self.answer_column]),
                    question_processed=str(row[self.index_column]),
                )
            )
        return search_results

    def answer(self, query: str) -> Optional[str]:
        results = self.search(query, top_k=1)
        return results[0].answer if results else None


def build_and_save_artifacts(
    artifact_dir: Path | str = DEFAULT_ARTIFACT_DIR,
) -> MedicalModel1HF:
    """Load HuggingFace data, fit BM25, and save artifacts locally."""
    model = MedicalModel1HF()
    model.fit()
    model.save_artifacts(artifact_dir)
    return model


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Model 1 BM25 using preprocessed HuggingFace data."
    )
    parser.add_argument(
        "--artifact-dir",
        default=str(DEFAULT_ARTIFACT_DIR),
        help="Folder for saving/loading processed data and fitted BM25 index.",
    )
    parser.add_argument(
        "--load-local",
        action="store_true",
        help="Load saved artifacts instead of downloading HuggingFace data.",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Do not save artifacts after fitting from HuggingFace.",
    )
    parser.add_argument(
        "--query",
        default="Bệnh tiểu đường type 2 có nguy hiểm không?",
        help="Query used for a quick retrieval demo.",
    )
    parser.add_argument("--top-k", type=int, default=3, help="Number of results to show.")
    return parser.parse_args()


if __name__ == "__main__":
    if not VIETNAMESE_SUPPORT:
        print("Warning: underthesea is not installed. Query matching quality may drop.")

    args = parse_args()
    artifact_dir = Path(args.artifact_dir)

    if args.load_local:
        print(f"Loading saved artifacts from: {artifact_dir}")
        model = MedicalModel1HF.load_artifacts(artifact_dir)
    else:
        print("Loading HuggingFace data and fitting BM25...")
        model = MedicalModel1HF()
        model.fit()
        if not args.no_save:
            saved_dir = model.save_artifacts(artifact_dir)
            print(f"Saved processed data and BM25 index to: {saved_dir}")

    query_text = args.query
    print("=" * 70)
    print("MODEL 1 - BM25 WITH PREPROCESSED HUGGINGFACE DATA")
    print(f"Dataset: {HF_REPO_ID} / config={HF_CONFIG_NAME}")
    print(f"Method : {model.method}")
    print(f"Query  : {query_text}")
    print("=" * 70)

    for rank, result in enumerate(model.search(query_text, top_k=args.top_k), start=1):
        print(f"\nTop {rank} | score={result.score:.4f} | index={result.index}")
        print(f"Question: {result.question}")
        print(f"Answer  : {result.answer[:500]}...")
