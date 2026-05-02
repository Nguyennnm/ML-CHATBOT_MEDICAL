"""
Model 1: Baseline - Information Retrieval using TF-IDF/BM25 + Cosine Similarity
Preprocessing module for text cleaning and vectorization

MODULE NÀY THỰC HIỆN:
1. Xử lý văn bản tiếng Việt
2. Vectorization bằng TF-IDF
3. Vectorization bằng BM25
4. Kết hợp TF-IDF + BM25 (Hybrid)
"""

# ==============================================
# IMPORT CÁC THƯ VIỆN CẦN THIẾT
# ==============================================
import re  # Xử lý biểu thức chính quy (Regular Expression)
import string  # Làm việc với chuỗi ký tự
import numpy as np  # Xử lý mảng số và tính toán khoa học
from typing import List, Dict, Tuple, Optional  # Ghi chú kiểu dữ liệu (Type hints)
import pandas as pd  # Xử lý dữ liệu bảng
from sklearn.feature_extraction.text import TfidfVectorizer  # Vectorize text bằng TF-IDF
from sklearn.metrics.pairwise import cosine_similarity  # Tính Cosine Similarity
from scipy.sparse import csr_matrix  # Ma trận sparse (thưa)
import unicodedata  # Xử lý Unicode (dấu tiếng Việt)

# ==============================================
# HỖ TRỢ TIẾNG VIỆT
# ==============================================
# Thử import thư viện underthesea để xử lý NLP tiếng Việt
try:
    import underthesea  # Thư viện NLP tiếng Việt
    VIETNAMESE_SUPPORT = True  # Có hỗ trợ tiếng Việt
except ImportError:
    VIETNAMESE_SUPPORT = False  # Không có underthesea, sử dụng split() thay thế
    print("Warning: underthesea not installed. Vietnamese tokenization may not be optimal.")


# ==============================================
# LỚP 1: XỬ LÝ VĂN BẢN (TEXT PREPROCESSING)
# ==============================================
class TextPreprocessor:
    """
    Lớp xử lý và làm sạch văn bản tiếng Việt cho chatbot y tế.
    
    Chức năng chính:
    - Loại bỏ dấu tiếng Việt
    - Xóa URL, email, ký tự đặc biệt
    - Chia nhỏ text thành từ (tokenization)
    - Loại bỏ từ vô nghĩa (stopwords)
    - Xử lý batch (nhiều text cùng lúc)
    """
    
    # Danh sách từ vô nghĩa tiếng Việt (không mang thông tin quan trọng)
    VIETNAMESE_STOPWORDS = {
        'và', 'là', 'cái', 'để', 'có', 'được', 'này', 'từ', 'đó', 'nếu',
        'như', 'nhưng', 'với', 'sau', 'trước', 'tại', 'trong', 'khi', 'nên',
        'hoặc', 'hay', 'chỉ', 'chủ', 'rồi', 'vì', 'được', 'những',
        'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'
    }
    
    def __init__(self, remove_stopwords: bool = True, use_stemming: bool = True):
        """
        Khởi tạo bộ xử lý text
        
        Args:
            remove_stopwords: Có loại bỏ từ vô nghĩa hay không (mặc định: True)
            use_stemming: Có áp dụng stemming hay không (mặc định: True)
        """
        self.remove_stopwords = remove_stopwords  # Cờ loại bỏ stopwords
        self.use_stemming = use_stemming  # Cờ áp dụng stemming
    
    @staticmethod
    def remove_accents(text: str) -> str:
        """
        Loại bỏ dấu tiếng Việt (à, á, ả, ã, ạ, ă, v.v.)
        
        Ví dụ: "Đái thái đường" → "Dai tho duong"
        """
        # NFD: Biến dạng Unicode thành các thành phần riêng lẻ (dấu + chữ)
        nfd = unicodedata.normalize('NFD', text)
        # Lọc bỏ các dấu (category 'Mn' = Mark, nonspacing)
        return ''.join(char for char in nfd if unicodedata.category(char) != 'Mn')
    
    @staticmethod
    def clean_text(text: str) -> str:
        """
        Làm sạch text: xóa URL, email, ký tự đặc biệt
        
        Quy trình:
        1. Chuyển thành chữ thường (lowercase)
        2. Xóa URL (http://, https://, www.)
        3. Xóa email
        4. Xóa ký tự đặc biệt (giữ lại chữ cái + khoảng trắng)
        5. Xóa khoảng trắng thừa
        
        Args:
            text: Văn bản gốc
            
        Returns:
            Văn bản đã được làm sạch
        """
        # Bước 1: Chuyển toàn bộ thành chữ thường
        text = text.lower()
        
        # Bước 2: Xóa URL (http://..., https://..., www...)
        text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
        
        # Bước 3: Xóa email (text@domain.com)
        text = re.sub(r'\S+@\S+', '', text)
        
        # Bước 4: Xóa ký tự đặc biệt và số, giữ lại chữ cái tiếng Việt + khoảng trắng
        # Biểu thức bao gồm: a-z, tất cả chữ cái tiếng Việt (có dấu), và khoảng trắng
        text = re.sub(r'[^a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ\s]', '', text)
        
        # Bước 5: Xóa khoảng trắng thừa (nhiều khoảng trắng → 1 khoảng trắng) và loại bỏ khoảng trắng đầu/cuối
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def tokenize(self, text: str) -> List[str]:
        """
        Chia nhỏ text thành từ (tokens)
        
        Quy trình:
        1. Làm sạch text
        2. Chia từ bằng underthesea (nếu có) hoặc split()
        3. Loại bỏ stopwords nếu cần
        4. Xóa từ quá ngắn (< 2 ký tự)
        
        Args:
            text: Văn bản gốc
            
        Returns:
            Danh sách các từ (tokens)
        """
        # Bước 1: Làm sạch text
        text = self.clean_text(text)
        
        # Bước 2: Chia từ
        # Ưu tiên sử dụng underthesea để xử lý tiếng Việt tốt hơn
        if VIETNAMESE_SUPPORT:
            try:
                # underthesea.word_tokenize: Chia từ tiếng Việt một cách thông minh
                tokens = underthesea.word_tokenize(text)
            except:
                # Nếu underthesea gặp lỗi, sử dụng split() thông thường
                tokens = text.split()
        else:
            # Nếu không có underthesea, dùng split() (chia theo khoảng trắng)
            tokens = text.split()
        
        # Bước 3: Loại bỏ từ vô nghĩa (stopwords) nếu được bật
        if self.remove_stopwords:
            tokens = [token for token in tokens if token not in self.VIETNAMESE_STOPWORDS]
        
        # Bước 4: Loại bỏ từ quá ngắn (ít hơn 2 ký tự) - những từ này ít mang thông tin
        tokens = [token for token in tokens if len(token) >= 2]
        
        return tokens
    
    def preprocess(self, text: str) -> str:
        """
        Xử lý hoàn chỉnh: làm sạch + tokenize + nối lại
        
        Args:
            text: Văn bản gốc
            
        Returns:
            Văn bản đã được xử lý (các từ được nối bằng khoảng trắng)
        """
        # Tokenize text (chia thành các từ)
        tokens = self.tokenize(text)
        # Nối lại các từ bằng khoảng trắng
        return ' '.join(tokens)
    
    def batch_preprocess(self, texts: List[str]) -> List[str]:
        """
        Xử lý nhiều text cùng một lúc
        
        Hữu ích khi cần xử lý danh sách tài liệu lớn
        
        Args:
            texts: Danh sách các văn bản gốc
            
        Returns:
            Danh sách các văn bản đã được xử lý
        """
        # Áp dụng preprocess cho từng text trong danh sách
        return [self.preprocess(text) for text in texts]


# ==============================================
# LỚP 2: TRUY XUẤT THÔNG TIN BẰNG TF-IDF
# ==============================================
class TFIDFRetriever:
    """
    Hệ thống truy xuất thông tin sử dụng TF-IDF (Term Frequency - Inverse Document Frequency)
    
    Nguyên tắc:
    - TF (Term Frequency): Số lần từ xuất hiện trong tài liệu
    - IDF (Inverse Document Frequency): Đánh trọng số từ hiếm gặp
    - Kết hợp: TF-IDF = TF * IDF (từ hiếm gặp có trọng số cao)
    - So sánh: Dùng Cosine Similarity để tìm tài liệu tương đồng
    """
    
    def __init__(self, max_features: int = 5000, ngram_range: Tuple = (1, 2)):
        """
        Khởi tạo bộ truy xuất TF-IDF
        
        Args:
            max_features: Số lượng từ tối đa để giữ lại (mặc định: 5000)
                         - Từ ít phổ biến sẽ bị loại bỏ
            ngram_range: Kích thước n-gram (mặc định: (1, 2))
                        - (1, 2) = sử dụng 1-word (unigram) và 2-word (bigram)
                        - Ví dụ: "bệnh", "đái thái"
        """
        # Khởi tạo TfidfVectorizer từ scikit-learn
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,  # Tối đa bao nhiêu từ
            ngram_range=ngram_range,  # Sử dụng unigram, bigram, v.v.
            min_df=1,  # Từ phải xuất hiện ít nhất 1 lần
            max_df=0.95,  # Từ không được xuất hiện trong >95% tài liệu (xóa từ quá phổ biến)
            stop_words='english'  # Loại bỏ stopwords tiếng Anh
        )
        self.documents = []  # Lưu danh sách tài liệu gốc
        self.tfidf_matrix = None  # Ma trận TF-IDF (sparse matrix)
    
    def fit(self, documents: List[str]):
        """
        Huấn luyện (fit) TF-IDF vectorizer trên danh sách tài liệu
        
        Công việc:
        1. Xây dựng từ vựng (vocabulary) từ tất cả tài liệu
        2. Tính TF (term frequency) cho mỗi từ
        3. Tính IDF (inverse document frequency)
        4. Tạo ma trận TF-IDF
        
        Args:
            documents: Danh sách các tài liệu đã được xử lý
        """
        self.documents = documents  # Lưu tài liệu gốc
        # Fit + transform: Xây dựng vectorizer và áp dụng nó
        self.tfidf_matrix = self.vectorizer.fit_transform(documents)
    
    def transform(self, texts: List[str]) -> csr_matrix:
        """
        Chuyển đổi text thành vector TF-IDF
        
        Sử dụng vectorizer đã được fit để chuyển đổi text mới
        
        Args:
            texts: Danh sách các text cần chuyển đổi
            
        Returns:
            Ma trận TF-IDF (sparse matrix) với shape (n_texts, max_features)
        """
        return self.vectorizer.transform(texts)
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        """
        Truy xuất top-k tài liệu phù hợp nhất với câu hỏi
        
        Quy trình:
        1. Chuyển câu hỏi thành vector TF-IDF
        2. Tính Cosine Similarity với tất cả tài liệu
        3. Sắp xếp và lấy top-k kết quả
        
        Args:
            query: Câu hỏi hoặc query của người dùng
            top_k: Số lượng tài liệu cần truy xuất (mặc định: 5)
            
        Returns:
            Danh sách (document_index, similarity_score) được sắp xếp từ cao xuống thấp
        """
        # Bước 1: Chuyển query thành vector TF-IDF
        query_vector = self.vectorizer.transform([query])
        
        # Bước 2: Tính Cosine Similarity giữa query và tất cả tài liệu
        # cosine_similarity trả về ma trận 2D, [0] để lấy hàng đầu tiên
        similarities = cosine_similarity(query_vector, self.tfidf_matrix)[0]
        
        # Bước 3: Lấy top-k indices (chỉ số của top-k tài liệu)
        # np.argsort: Sắp xếp từ nhỏ đến lớn
        # [-top_k:] Lấy top-k phần tử cuối (cao nhất)
        # [::-1] Đảo ngược để sắp xếp từ cao xuống thấp
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        # Bước 4: Trả về danh sách (index, score) cho các tài liệu có score > 0
        return [(idx, similarities[idx]) for idx in top_indices if similarities[idx] > 0]


# ==============================================
# LỚP 3: TRUY XUẤT THÔNG TIN BẰNG BM25
# ==============================================
class BM25Retriever:
    """
    Thuật toán BM25 (Best Matching 25) - Cải tiến hơn TF-IDF
    
    Ưu điểm BM25 so với TF-IDF:
    - Chuẩn hóa độ dài tài liệu (tài liệu dài không bị ưu tiên quá mức)
    - Kiểm soát tần suất từ tốt hơn (tần suất cao hơn không tăng score vô hạn)
    - Có 2 tham số k1 và b để điều chỉnh hiệu suất
    """
    
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        """
        Khởi tạo bộ truy xuất BM25
        
        Args:
            k1: Tham số kiểm soát tần suất từ (mặc định: 1.5)
                - k1 cao → Tần suất từ ảnh hưởng nhiều hơn
                - k1 thấp → Tần suất từ ảnh hưởng ít hơn
                - Phạm vi thông dụng: 1.2 - 2.0
            b: Tham số kiểm soát chuẩn hóa độ dài tài liệu (mặc định: 0.75)
                - b = 1: Chuẩn hóa đầy đủ (tài liệu dài bị phạt nhiều)
                - b = 0: Không chuẩn hóa (tài liệu dài không bị phạt)
                - Phạm vi: 0.0 - 1.0
        """
        self.k1 = k1  # Tham số k1
        self.b = b  # Tham số b
        self.documents = []  # Danh sách tài liệu gốc
        self.tokenized_docs = []  # Tài liệu đã được tokenize
        self.vocab = {}  # Từ vựng (từ → ID)
        self.doc_freqs = {}  # Tần suất tài liệu chứa từ (DF - Document Frequency)
        self.idf = {}  # IDF (Inverse Document Frequency)
        self.doc_lengths = []  # Độ dài của mỗi tài liệu
        self.avg_doc_length = 0  # Độ dài trung bình tất cả tài liệu
        self.num_docs = 0  # Tổng số tài liệu
    
    def fit(self, documents: List[str], tokenizer=None):
        """
        Xây dựng chỉ mục BM25 từ danh sách tài liệu
        
        Quy trình:
        1. Tokenize tất cả tài liệu
        2. Xây dựng từ vựng (vocabulary)
        3. Tính tần suất tài liệu (DF) cho mỗi từ
        4. Tính độ dài trung bình tài liệu
        5. Tính IDF cho mỗi từ
        
        Args:
            documents: Danh sách các tài liệu đã được xử lý
            tokenizer: Hàm chia từ (mặc định: split)
        """
        self.documents = documents  # Lưu tài liệu gốc
        self.num_docs = len(documents)  # Số lượng tài liệu
        
        # Bước 1: Tokenize tất cả tài liệu
        if tokenizer is None:
            tokenizer = lambda x: x.split()  # Dùng split() nếu không có tokenizer
        
        self.tokenized_docs = [tokenizer(doc) for doc in documents]
        
        # Bước 2-3: Xây dựng từ vựng và tính DF
        for doc_idx, tokens in enumerate(self.tokenized_docs):
            # Lưu độ dài tài liệu
            doc_length = len(tokens)
            self.doc_lengths.append(doc_length)
            
            # Xử lý từng từ duy nhất trong tài liệu
            for token in set(tokens):  # set() để đếm từ chỉ 1 lần mỗi tài liệu
                # Khởi tạo nếu từ chưa tồn tại
                self.vocab.setdefault(token, 0)
                self.doc_freqs.setdefault(token, 0)
                
                # Gán ID cho từ nếu chưa có
                if token not in self.vocab:
                    self.vocab[token] = len(self.vocab)
                
                # Tăng tần suất tài liệu (số tài liệu chứa từ này)
                self.doc_freqs[token] += 1
        
        # Bước 4: Tính độ dài trung bình tài liệu
        self.avg_doc_length = sum(self.doc_lengths) / self.num_docs if self.num_docs > 0 else 0
        
        # Bước 5: Tính IDF (Inverse Document Frequency) cho mỗi từ
        # Công thức IDF trong BM25: log((N - df + 0.5) / (df + 0.5) + 1)
        # Với: N = tổng số tài liệu, df = số tài liệu chứa từ
        for token, df in self.doc_freqs.items():
            self.idf[token] = np.log((self.num_docs - df + 0.5) / (df + 0.5) + 1.0)
    
    def retrieve(self, query: str, top_k: int = 5, tokenizer=None) -> List[Tuple[int, float]]:
        """
        Truy xuất top-k tài liệu bằng BM25
        
        Quy trình:
        1. Tokenize câu hỏi
        2. Tính BM25 score cho mỗi tài liệu
        3. Lấy top-k tài liệu có score cao nhất
        
        Công thức BM25:
        BM25(D, Q) = Σ IDF(q_i) * ((k1 + 1) * f(q_i, D)) / 
                     (f(q_i, D) + k1 * (1 - b + b * (|D| / avgdl)))
        
        Trong đó:
        - IDF(q_i): Inverse document frequency của từ q_i
        - f(q_i, D): Tần suất từ q_i trong tài liệu D
        - |D|: Độ dài tài liệu D
        - avgdl: Độ dài trung bình tất cả tài liệu
        - k1, b: Tham số điều chỉnh
        
        Args:
            query: Câu hỏi của người dùng
            top_k: Số lượng tài liệu cần truy xuất (mặc định: 5)
            tokenizer: Hàm chia từ (mặc định: split)
            
        Returns:
            Danh sách (document_index, bm25_score) được sắp xếp từ cao xuống thấp
        """
        # Khởi tạo tokenizer nếu không có
        if tokenizer is None:
            tokenizer = lambda x: x.split()
        
        # Bước 1: Tokenize câu hỏi
        query_tokens = tokenizer(query)
        # Khởi tạo mảng scores cho tất cả tài liệu (ban đầu = 0)
        scores = np.zeros(self.num_docs)
        
        # Bước 2: Tính BM25 score cho mỗi tài liệu
        # Xử lý từng từ duy nhất trong query
        for token in set(query_tokens):
            # Nếu từ không có trong từ vựng, bỏ qua
            if token not in self.idf:
                continue
            
            # Lấy IDF của từ
            idf_score = self.idf[token]
            
            # Tính BM25 score cho từ này với mỗi tài liệu
            for doc_idx, doc_tokens in enumerate(self.tokenized_docs):
                # Tần suất từ trong tài liệu
                freq = doc_tokens.count(token)
                # Độ dài tài liệu
                doc_length = self.doc_lengths[doc_idx]
                
                # Áp dụng công thức BM25
                # Tử số: freq * (k1 + 1)
                numerator = freq * (self.k1 + 1)
                # Mẫu số: freq + k1 * (1 - b + b * (doc_length / avg_doc_length))
                denominator = freq + self.k1 * (1 - self.b + self.b * (doc_length / self.avg_doc_length))
                
                # Cộng dồn BM25 score của từ này vào tài liệu
                scores[doc_idx] += idf_score * (numerator / denominator)
        
        # Bước 3: Lấy top-k tài liệu
        # np.argsort: Sắp xếp từ thấp đến cao
        # [-top_k:]: Lấy top-k phần tử cuối (cao nhất)
        # [::-1]: Đảo ngược để sắp xếp từ cao xuống thấp
        top_indices = np.argsort(scores)[-top_k:][::-1]
        
        # Trả về danh sách (index, score) cho các tài liệu có score > 0
        return [(idx, scores[idx]) for idx in top_indices if scores[idx] > 0]


# ==============================================
# LỚP 4: KỸ THUẬT KẾT HỢP (HYBRID RETRIEVER)
# ==============================================
class HybridRetriever:
    """
    Bộ truy xuất lai (Hybrid) - Kết hợp TF-IDF và BM25
    
    Ý tưởng:
    - Sử dụng cả TF-IDF và BM25
    - Kết hợp điểm số từ cả hai phương pháp
    - Có thể điều chỉnh trọng số để ưu tiên phương pháp nào
    - Thường cho kết quả tốt hơn khi sử dụng riêng lẻ
    
    Công thức:
    Hybrid_Score = tfidf_weight * tfidf_score + bm25_weight * bm25_score
    """
    
    def __init__(self, tfidf_weight: float = 0.5, bm25_weight: float = 0.5):
        """
        Khởi tạo bộ truy xuất lai
        
        Args:
            tfidf_weight: Trọng số TF-IDF (mặc định: 0.5 = 50%)
                         - 0.5 = TF-IDF chiếm 50% điểm số cuối cùng
            bm25_weight: Trọng số BM25 (mặc định: 0.5 = 50%)
                        - 0.5 = BM25 chiếm 50% điểm số cuối cùng
        """
        self.tfidf_weight = tfidf_weight  # Trọng số TF-IDF
        self.bm25_weight = bm25_weight  # Trọng số BM25
        self.tfidf_retriever = None  # Bộ truy xuất TF-IDF
        self.bm25_retriever = None  # Bộ truy xuất BM25
        self.documents = []  # Danh sách tài liệu gốc
    
    def fit(self, documents: List[str], preprocessor: Optional[TextPreprocessor] = None):
        """
        Huấn luyện cả TF-IDF và BM25
        
        Quy trình:
        1. Xử lý tài liệu nếu có preprocessor
        2. Khởi tạo và huấn luyện TFIDFRetriever
        3. Khởi tạo và huấn luyện BM25Retriever
        
        Args:
            documents: Danh sách các tài liệu (có thể chưa xử lý)
            preprocessor: Bộ xử lý text (nếu có)
        """
        self.documents = documents  # Lưu tài liệu gốc
        preprocessed_docs = documents  # Tài liệu sẽ dùng cho huấn luyện
        
        # Bước 1: Xử lý tài liệu nếu có preprocessor
        if preprocessor is not None:
            preprocessed_docs = preprocessor.batch_preprocess(documents)
        
        # Bước 2: Huấn luyện TF-IDF retriever
        self.tfidf_retriever = TFIDFRetriever()
        self.tfidf_retriever.fit(preprocessed_docs)
        
        # Bước 3: Huấn luyện BM25 retriever
        self.bm25_retriever = BM25Retriever()
        # Sử dụng tokenizer từ preprocessor nếu có
        if preprocessor is not None:
            tokenizer = preprocessor.tokenize
        else:
            tokenizer = lambda x: x.split()
        self.bm25_retriever.fit(preprocessed_docs, tokenizer=tokenizer)
    
    def retrieve(self, query: str, top_k: int = 5, preprocessor: Optional[TextPreprocessor] = None) -> List[Tuple[int, float]]:
        """
        Truy xuất top-k tài liệu bằng điểm kết hợp
        
        Quy trình:
        1. Xử lý câu hỏi (nếu có preprocessor)
        2. Truy xuất từ TF-IDF retriever
        3. Truy xuất từ BM25 retriever
        4. Kết hợp điểm số theo công thức weighted sum
        5. Sắp xếp và lấy top-k kết quả
        
        Args:
            query: Câu hỏi của người dùng
            top_k: Số lượng tài liệu cần truy xuất (mặc định: 5)
            preprocessor: Bộ xử lý text (nếu có)
            
        Returns:
            Danh sách (document_index, hybrid_score) được sắp xếp từ cao xuống thấp
        """
        # Bước 1: Xử lý câu hỏi
        if preprocessor is not None:
            processed_query = preprocessor.preprocess(query)
        else:
            processed_query = query
        
        # Bước 2: Truy xuất từ TF-IDF retriever
        tfidf_results = self.tfidf_retriever.retrieve(processed_query, top_k=top_k)
        # Bước 3: Truy xuất từ BM25 retriever
        bm25_results = self.bm25_retriever.retrieve(processed_query, top_k=top_k)
        
        # Bước 4: Kết hợp điểm số
        score_dict = {}  # Dictionary lưu điểm số kết hợp
        
        # Thêm TF-IDF scores với trọng số
        for idx, score in tfidf_results:
            score_dict[idx] = self.tfidf_weight * score
        
        # Thêm BM25 scores với trọng số
        for idx, score in bm25_results:
            # .get(idx, 0): Lấy giá trị hiện tại hoặc 0 nếu không tồn tại
            score_dict[idx] = score_dict.get(idx, 0) + self.bm25_weight * score
        
        # Bước 5: Sắp xếp và lấy top-k kết quả
        # sorted(): Sắp xếp dictionary theo giá trị (score)
        # reverse=True: Sắp xếp từ cao xuống thấp
        sorted_results = sorted(score_dict.items(), key=lambda x: x[1], reverse=True)
        # Trả về top-k kết quả
        return sorted_results[:top_k]


# ==============================================
# PHẦN THỰC NGHIỆM VÀ VÍ DỤ SỬ DỤNG
# ==============================================
if __name__ == "__main__":
    # Danh sách tài liệu y tế mẫu
    sample_docs = [
        "Bệnh đái tháo đường là một bệnh lý chuyển hóa glucose trong máu",
        "Điều trị cao huyết áp bằng thuốc an thần và kiểm soát chế độ ăn",
        "Cảm cúm thường kéo dài 7-10 ngày, triệu chứng bao gồm sốt, ho, nhức đầu",
        "Ung thư phổi là bệnh lý nguy hiểm, cần được phát hiện sớm",
        "Tim mạch yếu có thể dẫn đến suy tim nếu không được điều trị"
    ]
    
    # Bước 1: Khởi tạo preprocessor
    # remove_stopwords=True: Loại bỏ từ vô nghĩa
    preprocessor = TextPreprocessor(remove_stopwords=True)
    
    # In tiêu đề
    print("="*60)
    print("MODEL 1: TF-IDF/BM25 + COSINE SIMILARITY RETRIEVER")
    print("Hệ thống truy xuất thông tin y tế")
    print("="*60)
    
    # Bước 2: Thử nghiệm xử lý text
    print("\n1. PHẦN THỬ NGHIỆM XỬ LÝ TEXT:")
    print("-"*60)
    sample_text = sample_docs[0]
    print(f"Text gốc: {sample_text}")
    print(f"Text xử lý: {preprocessor.preprocess(sample_text)}")
    
    # Xử lý tất cả tài liệu
    preprocessed_docs = preprocessor.batch_preprocess(sample_docs)
    
    # Bước 3: Thử nghiệm TF-IDF Retriever
    print("\n2. THỬ NGHIỆM TF-IDF RETRIEVER:")
    print("-"*60)
    tfidf_retriever = TFIDFRetriever()
    tfidf_retriever.fit(preprocessed_docs)
    
    query = "Bệnh đái thái đường"
    results = tfidf_retriever.retrieve(preprocessor.preprocess(query), top_k=3)
    print(f"Câu hỏi: {query}")
    for doc_idx, score in results:
        print(f"  Doc {doc_idx}: {sample_docs[doc_idx][:60]}... (Score: {score:.4f})")
    
    # Bước 4: Thử nghiệm BM25 Retriever
    print("\n3. THỬ NGHIỆM BM25 RETRIEVER:")
    print("-"*60)
    bm25_retriever = BM25Retriever()
    bm25_retriever.fit(preprocessed_docs, tokenizer=preprocessor.tokenize)
    
    results = bm25_retriever.retrieve(preprocessor.preprocess(query), top_k=3, tokenizer=preprocessor.tokenize)
    print(f"Câu hỏi: {query}")
    for doc_idx, score in results:
        print(f"  Doc {doc_idx}: {sample_docs[doc_idx][:60]}... (Score: {score:.4f})")
    
    # Bước 5: Thử nghiệm Hybrid Retriever (khuyến nghị dùng)
    print("\n4. THỬ NGHIỆM HYBRID RETRIEVER (TF-IDF + BM25):")
    print("-"*60)
    # Khởi tạo hybrid retriever với trọng số 50-50
    hybrid_retriever = HybridRetriever(tfidf_weight=0.5, bm25_weight=0.5)
    hybrid_retriever.fit(sample_docs, preprocessor=preprocessor)
    
    results = hybrid_retriever.retrieve(query, top_k=3, preprocessor=preprocessor)
    print(f"Câu hỏi: {query}")
    for doc_idx, score in results:
        print(f"  Doc {doc_idx}: {sample_docs[doc_idx][:60]}... (Score: {score:.4f})")
