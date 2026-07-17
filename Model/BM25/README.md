# Model 1 — BM25 Retriever

## Tổng quan

`model_bm25.py` là baseline truy xuất thông tin cho chatbot y tế tiếng Việt, chỉ sử dụng thuật toán **BM25**. Model tải dữ liệu đã được tiền xử lý từ Hugging Face, tìm các câu hỏi tương tự nhất với truy vấn người dùng, rồi trả về câu trả lời tương ứng trong dataset.

Nguồn dữ liệu:

- Repository: `ynguyen1010/medical_vietnamese_datasets`
- Cấu hình: `tfidf`
- Split: `train`
- Cột được lập chỉ mục: `question_processed`
- Cột trả về: `answer_cleaned`

Model không sinh văn bản mới; câu trả lời là nội dung có sẵn của kết quả được xếp hạng cao nhất.

## Quy trình hoạt động

```text
Câu hỏi người dùng
        ↓
Làm sạch và chuẩn hóa tiếng Việt
        ↓
Tách từ, nối từ đa âm tiết bằng dấu _ và bỏ stopwords
        ↓
BM25 trên question_processed
        ↓
Top-k câu hỏi phù hợp và answer_cleaned tương ứng
```

Trước khi truy xuất, truy vấn được chuẩn hóa Unicode NFC, chuyển thành chữ thường, xóa HTML/URL/email/số điện thoại, giữ lại ký tự phù hợp với ngữ cảnh y tế, tách từ bằng `underthesea` và loại bỏ stopwords. Việc này giúp truy vấn có cùng định dạng với dữ liệu `question_processed` đã được chuẩn bị sẵn.

## Cài đặt

Yêu cầu Python 3.10 trở lên vì mã nguồn sử dụng cú pháp kiểu `Path | str`.

```bash
pip install datasets joblib numpy pandas underthesea
```

`underthesea` là tùy chọn: chương trình vẫn hoạt động nếu chưa cài, nhưng việc tách từ tiếng Việt sẽ kém chính xác hơn và chương trình sẽ hiển thị cảnh báo.

## Chạy bằng dòng lệnh

Đi đến thư mục chứa model:

```bash
cd Models/Model/BM25
```

### Lần chạy đầu

Lệnh này tải dữ liệu từ Hugging Face, xây chỉ mục BM25, lưu artifacts cục bộ và hiển thị 3 kết quả đầu.

```bash
python model_bm25.py --query "Bệnh tiểu đường type 2 có nguy hiểm không?" --top-k 3
```

Artifacts được lưu mặc định tại:

```text
artifacts/model_bm25/
```

### Nạp lại chỉ mục đã lưu

Sau lần chạy đầu, có thể nạp lại dữ liệu và chỉ mục cục bộ để không cần tải/fitting lại:

```bash
python model_bm25.py --load-local --query "Cách kiểm soát đường huyết" --top-k 3
```

### Đổi thư mục artifacts

```bash
python model_bm25.py --artifact-dir ./artifacts/bm25_v1
python model_bm25.py --artifact-dir ./artifacts/bm25_v1 --load-local
```

### Chạy thử mà không lưu index

```bash
python model_bm25.py --no-save --query "Triệu chứng cao huyết áp" --top-k 5
```

## Tham số dòng lệnh

| Tham số | Mặc định | Mô tả |
| --- | --- | --- |
| `--artifact-dir` | `artifacts/model_bm25` | Thư mục dùng để lưu hoặc nạp artifacts. |
| `--load-local` | tắt | Nạp artifacts đã lưu thay vì tải dataset và xây lại index. |
| `--no-save` | tắt | Không lưu artifacts sau khi fit. |
| `--query` | câu hỏi mẫu về tiểu đường type 2 | Truy vấn dùng để demo. |
| `--top-k` | `3` | Số kết quả được hiển thị. |

## Sử dụng trong Python

### Xây model và tìm kiếm

```python
from model_bm25 import MedicalModel1HF

# Tải dữ liệu Hugging Face và fit BM25 trên question_processed.
model = MedicalModel1HF()
model.fit()

results = model.search("Làm thế nào để kiểm soát đường huyết?", top_k=3)

for rank, result in enumerate(results, start=1):
    print(f"Top {rank} | score={result.score:.4f}")
    print("Question:", result.question)
    print("Answer:", result.answer)
```

Mỗi phần tử trong `results` là `SearchResult` với các trường:

| Trường | Ý nghĩa |
| --- | --- |
| `index` | Chỉ số dòng trong dữ liệu sau khi loại các bản ghi thiếu `question_processed`. |
| `score` | Điểm BM25; chỉ dùng để xếp hạng trong cùng một lần tìm kiếm. |
| `question` | Nội dung `question_cleaned`. |
| `answer` | Nội dung `answer_cleaned`. |
| `question_processed` | Câu hỏi đã tiền xử lý được dùng để lập chỉ mục. |

### Lấy trực tiếp câu trả lời tốt nhất

```python
answer = model.answer("Triệu chứng của cảm cúm là gì?")
print(answer)
```

`answer()` gọi `search()` với `top_k=1` và trả về câu trả lời của kết quả đầu tiên.

### Lưu và nạp model

```python
from model_bm25 import MedicalModel1HF

model = MedicalModel1HF()
model.fit()
model.save_artifacts("artifacts/model_bm25")

loaded_model = MedicalModel1HF.load_artifacts("artifacts/model_bm25")
print(loaded_model.answer("Làm sao phòng tránh cảm cúm?"))
```

Hoặc xây và lưu trong một lệnh:

```python
from model_bm25 import build_and_save_artifacts

model = build_and_save_artifacts("artifacts/model_bm25")
```

## BM25 trong model

`BM25Retriever` dùng các giá trị mặc định:

```python
BM25Retriever(k1=1.5, b=0.75)
```

Điểm BM25 cho tài liệu `D` và truy vấn `Q` được tính như sau:

```text
BM25(D, Q) = Σ IDF(q) × f(q, D) × (k1 + 1)
             ───────────────────────────────────
             f(q, D) + k1 × (1 - b + b × |D| / avgdl)
```

Trong đó `f(q, D)` là số lần token `q` xuất hiện trong tài liệu, `|D|` là độ dài tài liệu và `avgdl` là độ dài tài liệu trung bình. Model sử dụng mỗi token truy vấn một lần khi tính điểm.

## Artifacts

Sau `save_artifacts()`, thư mục đích chứa:

| Tệp | Nội dung |
| --- | --- |
| `metadata.json` | Thông tin dataset, tên cột, phương pháp `bm25`, số dòng, số tài liệu và kích thước từ vựng. |
| `processed_data.pkl` | DataFrame đã dùng để fit model. |
| `bm25_retriever.joblib` | Chỉ mục BM25 đã fit. |

Để nạp artifacts thành công, cả ba tệp phải tồn tại và `metadata.json` phải có `method` là `bm25`.

## Cấu trúc mã nguồn

```text
model_bm25.py
├── preprocess_query()              # tiền xử lý truy vấn tiếng Việt
├── load_preprocessed_hf_dataset()  # tải dataset Hugging Face
├── BM25Retriever                   # xây chỉ mục và xếp hạng BM25
├── SearchResult                    # kiểu dữ liệu của một kết quả tìm kiếm
├── MedicalModel1HF                 # fit, search, answer, lưu và nạp model
└── build_and_save_artifacts()      # tiện ích xây và lưu artifacts
```

## Khắc phục lỗi thường gặp

### Thiếu thư viện `datasets`

```text
ImportError: Missing dependency `datasets`
```

Cài dependencies ở phần Cài đặt.

### Không tìm thấy artifacts

```text
FileNotFoundError: Cannot find saved artifacts ...
```

Chạy script một lần không có `--load-local`, hoặc kiểm tra lại `--artifact-dir`.

### Gọi tìm kiếm trước khi fit

```text
RuntimeError: Model must be fitted before search().
```

Gọi `model.fit()` trước khi `search()`, hoặc dùng `MedicalModel1HF.load_artifacts(...)`.

### Chất lượng truy xuất thấp

- Cài `underthesea` để tách từ tiếng Việt nhất quán hơn.
- Đặt câu hỏi rõ ràng, có các từ khóa chuyên môn liên quan.
- Kiểm tra phạm vi kiến thức của dataset; model chỉ có thể trả về nội dung đã tồn tại trong dữ liệu.
