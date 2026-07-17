# Model 1 — TF-IDF, BM25 và Hybrid Retriever

## 1. Tổng quan

`model1_tfidf_hf.py` là Model 1 của hệ thống truy xuất câu hỏi–trả lời y tế tiếng Việt. Đây là một baseline không dùng mô hình học sâu: model tìm câu hỏi tương tự nhất trong tập dữ liệu, sau đó trả về câu trả lời đã gắn với câu hỏi đó.

Nguồn dữ liệu là cấu hình `tfidf` trong bộ dữ liệu Hugging Face [`ynguyen1010/medical_vietnamese_datasets`](https://huggingface.co/datasets/ynguyen1010/medical_vietnamese_datasets), split `train`.

Luồng xử lý:

```text
Câu hỏi người dùng
        ↓
Làm sạch → tách từ tiếng Việt → bỏ stopwords
        ↓
Truy xuất trên cột question_processed
        ↓
TF-IDF / BM25 / Hybrid
        ↓
Top-k câu hỏi phù hợp + answer_cleaned tương ứng
```

Model **không sinh câu trả lời mới**. Kết quả là câu trả lời có sẵn trong dataset của tài liệu được xếp hạng cao nhất.

## 2. Các phương pháp hỗ trợ

| Phương pháp | Mô tả | Khi nên dùng |
| --- | --- | --- |
| `tfidf` | Dùng `TfidfVectorizer` với unigram–bigram, sau đó tính cosine similarity. | Baseline nhanh, dễ kiểm tra. |
| `bm25` | Xếp hạng bằng BM25 với `k1=1.5`, `b=0.75`. | Khi muốn ưu tiên mức độ khớp từ khóa và chuẩn hóa theo độ dài tài liệu. |
| `hybrid` | Kết hợp kết quả TF-IDF và BM25. | Mặc định; phù hợp để thử nghiệm kết hợp hai cách truy xuất. |

Với `hybrid`, điểm được tính theo:

```text
hybrid_score = tfidf_weight × tfidf_score + bm25_weight × bm25_score
```

Trọng số mặc định là `0.5` cho TF-IDF và `0.5` cho BM25. Các điểm số của hai phương pháp không được chuẩn hóa riêng trước khi cộng, do đó nên đánh giá thực nghiệm trước khi thay đổi trọng số.

## 3. Dữ liệu và tiền xử lý

Dataset phải có các cột sau:

| Cột | Vai trò |
| --- | --- |
| `question_cleaned` | Câu hỏi để hiển thị trong kết quả. |
| `answer_cleaned` | Câu trả lời được trả về. |
| `question_processed` | Câu hỏi đã tiền xử lý, được dùng để lập chỉ mục. |
| `answer_processed` | Câu trả lời đã tiền xử lý trong dataset. |

Tài liệu được lập chỉ mục từ `question_processed`. Với truy vấn đầu vào, hàm `preprocess_query()` thực hiện:

1. Chuẩn hóa Unicode NFC và chuyển về chữ thường.
2. Xóa thẻ HTML, URL, email, số điện thoại và ký tự không cần thiết.
3. Giữ chữ cái, chữ số cùng một số dấu câu y tế như `. , ; : / % ( ) -`.
4. Tách từ tiếng Việt bằng `underthesea.word_tokenize` và nối từ đa âm tiết bằng dấu gạch dưới.
5. Loại bỏ stopwords.

Không cần tự tiền xử lý trước khi truyền câu hỏi vào `search()` hoặc `answer()`.

## 4. Cài đặt

Yêu cầu Python 3.10+ (file sử dụng cú pháp kiểu `Path | str`). Cài các thư viện:

```bash
pip install datasets joblib numpy pandas scipy scikit-learn underthesea
```

`underthesea` là tùy chọn về mặt kỹ thuật: nếu chưa cài, chương trình vẫn chạy nhưng chỉ tách bằng khoảng trắng và sẽ cảnh báo chất lượng truy xuất có thể giảm.

## 5. Chạy bằng dòng lệnh

Di chuyển đến thư mục model:

```bash
cd Models/Model/BM25
```

### Lần chạy đầu

Lệnh sau tải dữ liệu từ Hugging Face, xây `hybrid` index, lưu artifacts cục bộ, rồi in ba kết quả đầu:

```bash
python model1_tfidf_hf.py --query "Bệnh tiểu đường type 2 có nguy hiểm không?" --top-k 3
```

Thư mục lưu mặc định là:

```text
artifacts/model1_tfidf_hf/
```

### Chọn retriever

```bash
python model1_tfidf_hf.py --method tfidf --query "Triệu chứng cao huyết áp" --top-k 5
python model1_tfidf_hf.py --method bm25 --query "Triệu chứng cao huyết áp" --top-k 5
python model1_tfidf_hf.py --method hybrid --query "Triệu chứng cao huyết áp" --top-k 5
```

### Nạp index đã lưu

Sau lần xây index đầu tiên, dùng `--load-local` để tránh tải và fit lại:

```bash
python model1_tfidf_hf.py --load-local --query "Cách kiểm soát đường huyết" --top-k 3
```

`--method` bị bỏ qua khi có `--load-local`: phương pháp được lấy từ `metadata.json` của artifacts đã lưu.

### Tùy chỉnh thư mục artifacts hoặc chỉ chạy thử

```bash
python model1_tfidf_hf.py --artifact-dir ./artifacts/model1_bm25 --method bm25
python model1_tfidf_hf.py --artifact-dir ./artifacts/model1_bm25 --load-local
python model1_tfidf_hf.py --method hybrid --no-save
```

## 6. Tham số CLI

| Tham số | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `--artifact-dir` | `artifacts/model1_tfidf_hf` | Thư mục ghi hoặc đọc artifacts. |
| `--method` | `hybrid` | `tfidf`, `bm25` hoặc `hybrid`; chỉ áp dụng khi xây index mới. |
| `--load-local` | tắt | Nạp artifacts có sẵn thay vì tải dữ liệu và fit index. |
| `--no-save` | tắt | Không ghi artifacts sau khi fit. |
| `--query` | câu hỏi mẫu về tiểu đường type 2 | Câu hỏi dùng cho demo. |
| `--top-k` | `3` | Số kết quả cần in. |

## 7. Dùng như một module Python

### Xây model và tìm kiếm

```python
from model1_tfidf_hf import MedicalModel1HF

model = MedicalModel1HF(
    method="hybrid",
    tfidf_weight=0.5,
    bm25_weight=0.5,
)
model.fit()  # tải dataset Hugging Face và lập chỉ mục question_processed

results = model.search("Làm thế nào để kiểm soát đường huyết?", top_k=3)
for rank, result in enumerate(results, start=1):
    print(f"Top {rank}: score={result.score:.4f}")
    print("Question:", result.question)
    print("Answer:", result.answer)
```

Mỗi phần tử kết quả có kiểu `SearchResult` gồm:

```python
result.index               # chỉ số dòng trong dữ liệu sau khi bỏ question_processed bị thiếu
result.score               # điểm truy xuất
result.question            # question_cleaned
result.answer              # answer_cleaned
result.question_processed  # văn bản đã dùng để lập chỉ mục
```

### Lấy câu trả lời tốt nhất

```python
answer = model.answer("Triệu chứng của cảm cúm là gì?")
print(answer)
```

`answer()` tương đương với `search(..., top_k=1)` và trả về `answer_cleaned` của kết quả đầu tiên.

### Lưu và nạp lại model

```python
from model1_tfidf_hf import MedicalModel1HF

model = MedicalModel1HF(method="bm25")
model.fit()
model.save_artifacts("artifacts/model1_bm25")

loaded_model = MedicalModel1HF.load_artifacts("artifacts/model1_bm25")
print(loaded_model.answer("Làm sao phòng tránh cảm cúm?"))
```

Hoặc gọi tiện ích xây và lưu trong một bước:

```python
from model1_tfidf_hf import build_and_save_artifacts

model = build_and_save_artifacts(
    artifact_dir="artifacts/model1_hybrid",
    method="hybrid",
    tfidf_weight=0.5,
    bm25_weight=0.5,
)
```

## 8. Artifacts được tạo

`save_artifacts()` ghi các tệp sau; tệp nào xuất hiện tùy theo phương pháp đã chọn.

| Tệp | `tfidf` | `bm25` | `hybrid` | Nội dung |
| --- | :---: | :---: | :---: | --- |
| `metadata.json` | ✓ | ✓ | ✓ | Cấu hình dataset, cột dữ liệu, phương pháp, trọng số và kích thước index. |
| `processed_data.pkl` | ✓ | ✓ | ✓ | DataFrame đã dùng để fit. |
| `tfidf_vectorizer.joblib` | ✓ |  | ✓ | `TfidfVectorizer` đã fit. |
| `tfidf_matrix.npz` | ✓ |  | ✓ | Ma trận TF-IDF sparse. |
| `bm25_retriever.joblib` |  | ✓ | ✓ | Chỉ mục BM25 đã fit. |

Không dùng `--load-local` hoặc `load_artifacts()` trước khi artifacts được tạo. Nếu thiếu `metadata.json` hay `processed_data.pkl`, chương trình sẽ báo `FileNotFoundError`.

## 9. Cấu trúc chính trong mã nguồn

```text
model1_tfidf_hf.py
├── preprocess_query()              # tiền xử lý truy vấn tiếng Việt
├── load_preprocessed_hf_dataset()  # tải dataset Hugging Face
├── TFIDFRetriever                  # TF-IDF + cosine similarity
├── BM25Retriever                   # BM25
├── HybridRetriever                 # kết hợp điểm hai retriever
├── MedicalModel1HF                 # API cấp cao: fit, search, answer, lưu/nạp
└── build_and_save_artifacts()      # tiện ích xây và lưu model
```

## 10. Khắc phục lỗi thường gặp

### Thiếu thư viện

```text
ImportError: Missing dependency `datasets`
```

Cài lại dependencies ở mục 4. Nếu thiếu `underthesea`, bạn có thể cài thư viện này để cải thiện việc tách từ tiếng Việt.

### Không nạp được model cục bộ

```text
FileNotFoundError: Cannot find saved artifacts ...
```

Hãy chạy model ít nhất một lần không có `--load-local`, hoặc kiểm tra lại giá trị `--artifact-dir`.

### Không gọi được `search()`

```text
RuntimeError: Model must be fitted before search().
```

Gọi `model.fit()` trước, hoặc khởi tạo bằng `MedicalModel1HF.load_artifacts(...)`.

### Chất lượng truy xuất chưa tốt

- Cài `underthesea` để đồng nhất việc tách từ với dataset đã tiền xử lý.
- Thử `--method tfidf`, `bm25` và `hybrid` trên một tập truy vấn đánh giá cố định.
- Với `hybrid`, đánh giá lại các trọng số `tfidf_weight` và `bm25_weight` trong mã Python.
- Kiểm tra câu hỏi có đúng ngữ cảnh y tế mà dataset hỗ trợ hay không.
