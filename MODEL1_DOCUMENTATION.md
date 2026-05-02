# Model 1: TF-IDF/BM25 + Cosine Similarity

## Tài liệu Giải thích Chi tiết

---

## 📋 Mục lục

1. [Tổng quan](#tổng-quan)
2. [Cấu trúc File](#cấu-trúc-file)
3. [Chi tiết từng Class](#chi-tiết-từng-class)
4. [Hướng dẫn Sử dụng](#hướng-dẫn-sử-dụng)
5. [Ví dụ Cụ thể](#ví-dụ-cụ-thể)
6. [Các Công thức Toán học](#các-công-thức-toán-học)

---

## 🎯 Tổng quan

### Mục đích chính

File `model1_preprocess.py` là **module xử lý dữ liệu** cho **Model 1 - Baseline** của chatbot y tế. Nó giúp:

- **Làm sạch** dữ liệu văn bản tiếng Việt
- **Chuyển đổi** text thành vector số (vectorization)
- **Tìm kiếm** tài liệu y tế phù hợp với câu hỏi người dùng

### Kỹ thuật sử dụng

- **TF-IDF** (Term Frequency - Inverse Document Frequency)
- **BM25** (Best Matching 25 Algorithm)
- **Cosine Similarity** (So sánh độ tương đồng)

---

## 📁 Cấu trúc File

```
model1_preprocess.py
├── Imports (Thư viện cần thiết)
├── TextPreprocessor (Lớp xử lý văn bản)
├── TFIDFRetriever (Lớp truy xuất TF-IDF)
├── BM25Retriever (Lớp truy xuất BM25)
├── HybridRetriever (Lớp kết hợp cả hai)
└── __main__ (Ví dụ sử dụng)
```

---

## 🔍 Chi tiết từng Class

### 1️⃣ TextPreprocessor (Xử lý Văn bản)

#### Mục đích

Làm sạch và chuẩn bị dữ liệu văn bản tiếng Việt để dùng cho các model truy xuất.

#### Các Phương thức

##### `__init__(remove_stopwords=True, use_stemming=True)`

**Khởi tạo preprocessor**

```python
preprocessor = TextPreprocessor(
    remove_stopwords=True,  # Loại bỏ từ vô nghĩa
    use_stemming=True       # Áp dụng stemming
)
```

**Tham số:**

- `remove_stopwords`: Có loại bỏ stopwords hay không
- `use_stemming`: Có áp dụng stemming hay không

**Stopwords tiếng Việt bao gồm:**

```
'và', 'là', 'cái', 'để', 'có', 'được', 'này', 'từ', 'đó', 'nếu',
'như', 'nhưng', 'với', 'sau', 'trước', 'tại', 'trong', 'khi', 'nên',
'hoặc', 'hay', 'chỉ', 'chủ', 'rồi', 'vì', 'được', 'những',
'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'
```

---

##### `remove_accents(text)` (Static Method)

**Loại bỏ dấu tiếng Việt**

```python
# Ví dụ
TextPreprocessor.remove_accents("Đái tháo đường")
# → "Dai thao duong"
```

**Cách hoạt động:**

- Sử dụng Unicode NFD normalization
- Xóa tất cả các diacritical marks (dấu)

---

##### `clean_text(text)` (Static Method)

**Làm sạch text: xóa URL, email, ký tự đặc biệt**

```python
# Ví dụ
TextPreprocessor.clean_text("Xem tại http://example.com và email@test.com!!!")
# → "xem tai va"
```

**Các bước xử lý:**

1. Chuyển thành chữ thường (lowercase)
2. Xóa URLs: `http://...`, `https://...`, `www...`
3. Xóa emails: `text@domain.com`
4. Xóa ký tự đặc biệt (giữ lại chữ cái + khoảng trắng)
5. Xóa khoảng trắng thừa

---

##### `tokenize(text)`

**Chia nhỏ text thành từ (tokens)**

```python
# Ví dụ
preprocessor = TextPreprocessor()
tokens = preprocessor.tokenize("Bệnh đái tháo đường là một bệnh lý")
# → ['bệnh', 'đái', 'tháo', 'đường', 'bệnh', 'lý']
```

**Cách hoạt động:**

1. Làm sạch text (xóa URL, ký tự đặc biệt)
2. Chia từ bằng `underthesea` (nếu có) hoặc `split()`
3. Loại bỏ stopwords (nếu `remove_stopwords=True`)
4. Xóa các từ quá ngắn (< 2 ký tự)

---

##### `preprocess(text)`

**Xử lý hoàn chỉnh: làm sạch + tokenize + nối lại**

```python
# Ví dụ
preprocessor = TextPreprocessor()
processed = preprocessor.preprocess("Bệnh đái tháo đường!!!")
# → "bệnh đái tháo đường"
```

---

##### `batch_preprocess(texts)`

**Xử lý nhiều text cùng lúc**

```python
# Ví dụ
texts = [
    "Bệnh đái tháo đường là...",
    "Cao huyết áp có thể gây..."
]
processed = preprocessor.batch_preprocess(texts)
# → ["bệnh đái tháo đường là", "cao huyết áp có thể gây"]
```

---

### 2️⃣ TFIDFRetriever (Truy xuất TF-IDF)

#### Mục đích

Sử dụng TF-IDF để đánh trọng số cho các từ, rồi tìm tài liệu tương đồng với câu hỏi.

#### Các Phương thức

##### `__init__(max_features=5000, ngram_range=(1, 2))`

**Khởi tạo TF-IDF vectorizer**

```python
retriever = TFIDFRetriever(
    max_features=5000,      # Tối đa 5000 từ
    ngram_range=(1, 2)      # Sử dụng 1-word và 2-word ngrams
)
```

**Tham số:**

- `max_features`: Số lượng từ tối đa để giữ lại
- `ngram_range`: Kích thước n-gram (1-gram = từ đơn, 2-gram = 2 từ liên tiếp)

---

##### `fit(documents)`

**Huấn luyện (fit) TF-IDF trên danh sách tài liệu**

```python
# Ví dụ
documents = [
    "bệnh đái tháo đường",
    "cao huyết áp",
    "tim mạch yếu"
]
retriever.fit(documents)
```

**Cách hoạt động:**

- Tính TF (Term Frequency) cho mỗi từ
- Tính IDF (Inverse Document Frequency)
- Tạo ma trận TF-IDF (sparse matrix)

---

##### `transform(texts)`

**Chuyển đổi text thành vector TF-IDF**

```python
# Ví dụ
vectors = retriever.transform(["bệnh đái tháo đường"])
# → Sparse matrix với shape (1, max_features)
```

---

##### `retrieve(query, top_k=5)`

**Tìm top-k tài liệu liên quan với câu hỏi**

```python
# Ví dụ
results = retriever.retrieve("bệnh đái tháo đường", top_k=3)
# → [(0, 0.8234), (2, 0.4521), (1, 0.2341)]
#    (document_index, similarity_score)
```

**Cách hoạt động:**

1. Chuyển câu hỏi thành vector TF-IDF
2. Tính Cosine Similarity với tất cả tài liệu
3. Sắp xếp và trả về top-k kết quả

---

### 3️⃣ BM25Retriever (Truy xuất BM25)

#### Mục đích

Sử dụng BM25 (cải tiến hơn TF-IDF) để tìm tài liệu phù hợp.

#### Các Phương thức

##### `__init__(k1=1.5, b=0.75)`

**Khởi tạo BM25 retriever**

```python
retriever = BM25Retriever(
    k1=1.5,   # Điều chỉnh tần suất từ (1.5 là giá trị thông thường)
    b=0.75    # Điều chỉnh độ dài tài liệu (0.75 là giá trị thông thường)
)
```

**Tham số:**

- `k1`: Kiểm soát mức độ bão hòa tần suất từ
  - k1 cao → Tần suất từ ảnh hưởng nhiều
  - k1 thấp → Tần suất từ ảnh hưởng ít
- `b`: Kiểm soát chuẩn hóa độ dài tài liệu
  - b=1 → Chuẩn hóa đầy đủ
  - b=0 → Không chuẩn hóa

---

##### `fit(documents, tokenizer=None)`

**Xây dựng chỉ mục BM25 từ tài liệu**

```python
# Ví dụ
documents = [
    "bệnh đái tháo đường",
    "cao huyết áp"
]
retriever.fit(documents)
```

**Cách hoạt động:**

1. Tokenize tất cả tài liệu
2. Xây dựng từ vựng (vocabulary)
3. Tính tần suất từ trong mỗi tài liệu
4. Tính IDF cho mỗi từ
5. Tính độ dài trung bình tài liệu

---

##### `retrieve(query, top_k=5, tokenizer=None)`

**Tìm top-k tài liệu bằng BM25**

```python
# Ví dụ
results = retriever.retrieve("đái tháo đường", top_k=3, tokenizer=None)
# → [(0, 5.234), (2, 2.341), (1, 0.982)]
#    (document_index, bm25_score)
```

**Công thức BM25:**

```
BM25(D, Q) = Σ IDF(qi) * (f(qi, D) * (k1 + 1)) /
             (f(qi, D) + k1 * (1 - b + b * (|D| / avgdl)))

Với:
- D: tài liệu
- Q: câu hỏi
- qi: từ thứ i trong câu hỏi
- f(qi, D): tần suất từ qi trong tài liệu D
- |D|: độ dài tài liệu D
- avgdl: độ dài trung bình tất cả tài liệu
- IDF: Inverse Document Frequency
```

---

### 4️⃣ HybridRetriever (Kết hợp TF-IDF + BM25)

#### Mục đích

Kết hợp điểm số TF-IDF và BM25 để có kết quả tốt nhất.

#### Các Phương thức

##### `__init__(tfidf_weight=0.5, bm25_weight=0.5)`

**Khởi tạo Hybrid retriever**

```python
retriever = HybridRetriever(
    tfidf_weight=0.5,   # TF-IDF chiếm 50%
    bm25_weight=0.5     # BM25 chiếm 50%
)
```

**Tham số:**

- `tfidf_weight`: Trọng số cho TF-IDF
- `bm25_weight`: Trọng số cho BM25

---

##### `fit(documents, preprocessor=None)`

**Huấn luyện cả TF-IDF và BM25**

```python
# Ví dụ
documents = ["bệnh đái tháo đường", "cao huyết áp"]
preprocessor = TextPreprocessor()

retriever = HybridRetriever()
retriever.fit(documents, preprocessor=preprocessor)
```

**Cách hoạt động:**

1. Tạo TFIDFRetriever và fit với tài liệu
2. Tạo BM25Retriever và fit với tài liệu
3. Lưu tài liệu gốc

---

##### `retrieve(query, top_k=5, preprocessor=None)`

**Tìm top-k tài liệu bằng điểm kết hợp**

```python
# Ví dụ
results = retriever.retrieve(
    "đái tháo đường",
    top_k=3,
    preprocessor=preprocessor
)
# → [(0, 7.5234), (2, 5.341), (1, 2.982)]
#    (document_index, hybrid_score)
```

**Công thức Hybrid:**

```
Hybrid_Score = tfidf_weight * tfidf_score + bm25_weight * bm25_score
```

**Ưu điểm:**

- Kết hợp ưu điểm của cả TF-IDF và BM25
- Có thể điều chỉnh trọng số theo nhu cầu
- Cho kết quả chính xác hơn

---

## 💻 Hướng dẫn Sử dụng

### Bước 1: Import các lớp cần thiết

```python
from model1_preprocess import (
    TextPreprocessor,
    TFIDFRetriever,
    BM25Retriever,
    HybridRetriever
)
```

### Bước 2: Chuẩn bị dữ liệu

```python
# Danh sách tài liệu y tế
documents = [
    "Bệnh đái tháo đường là một bệnh lý chuyển hóa glucose trong máu",
    "Điều trị cao huyết áp bằng thuốc an thần và kiểm soát chế độ ăn",
    "Cảm cúm thường kéo dài 7-10 ngày, triệu chứng bao gồm sốt, ho",
    "Ung thư phổi là bệnh lý nguy hiểm, cần được phát hiện sớm",
    "Tim mạch yếu có thể dẫn đến suy tim nếu không được điều trị"
]
```

### Bước 3: Khởi tạo Preprocessor

```python
preprocessor = TextPreprocessor(
    remove_stopwords=True,
    use_stemming=True
)
```

### Bước 4: Chọn phương pháp truy xuất

#### Option A: Sử dụng TF-IDF

```python
retriever = TFIDFRetriever(max_features=5000)
retriever.fit(preprocessor.batch_preprocess(documents))

query = "Bệnh đái tháo đường"
results = retriever.retrieve(
    preprocessor.preprocess(query),
    top_k=3
)

for doc_idx, score in results:
    print(f"Doc {doc_idx}: {documents[doc_idx]} (Score: {score:.4f})")
```

#### Option B: Sử dụng BM25

```python
retriever = BM25Retriever(k1=1.5, b=0.75)
retriever.fit(
    preprocessor.batch_preprocess(documents),
    tokenizer=preprocessor.tokenize
)

query = "Bệnh đái tháo đường"
results = retriever.retrieve(
    preprocessor.preprocess(query),
    top_k=3,
    tokenizer=preprocessor.tokenize
)

for doc_idx, score in results:
    print(f"Doc {doc_idx}: {documents[doc_idx]} (Score: {score:.4f})")
```

#### Option C: Sử dụng Hybrid (Khuyến nghị)

```python
retriever = HybridRetriever(tfidf_weight=0.5, bm25_weight=0.5)
retriever.fit(documents, preprocessor=preprocessor)

query = "Bệnh đái tháo đường"
results = retriever.retrieve(query, top_k=3, preprocessor=preprocessor)

for doc_idx, score in results:
    print(f"Doc {doc_idx}: {documents[doc_idx]} (Score: {score:.4f})")
```

---

## 📝 Ví dụ Cụ thể

### Ví dụ 1: Truy xuất Tài liệu Y tế

```python
from model1_preprocess import TextPreprocessor, HybridRetriever

# Dữ liệu
documents = [
    "Bệnh đái tháo đường là bệnh lý chuyển hóa glucose, cần kiểm soát đường huyết",
    "Cao huyết áp có thể điều trị bằng thuốc hoặc thay đổi lối sống",
    "Cảm cúm là bệnh do virus gây ra, thường tự khỏi trong 1-2 tuần",
    "Stress và lo âu có thể gây các vấn đề sức khỏe tâm thần"
]

# Khởi tạo
preprocessor = TextPreprocessor()
retriever = HybridRetriever(tfidf_weight=0.6, bm25_weight=0.4)

# Huấn luyện
retriever.fit(documents, preprocessor=preprocessor)

# Truy xuất
query = "Làm thế nào để kiểm soát đường huyết?"
results = retriever.retrieve(query, top_k=2, preprocessor=preprocessor)

# Kết quả
print(f"Câu hỏi: {query}")
print(f"\nKết quả truy xuất:")
for idx, (doc_idx, score) in enumerate(results, 1):
    print(f"{idx}. {documents[doc_idx]}")
    print(f"   Score: {score:.4f}\n")
```

**Output:**

```
Câu hỏi: Làm thế nào để kiểm soát đường huyết?

Kết quả truy xuất:
1. Bệnh đái tháo đường là bệnh lý chuyển hóa glucose, cần kiểm soát đường huyết
   Score: 6.5234

2. Cao huyết áp có thể điều trị bằng thuốc hoặc thay đổi lối sống
   Score: 2.1342
```

### Ví dụ 2: So sánh TF-IDF vs BM25

```python
from model1_preprocess import TextPreprocessor, TFIDFRetriever, BM25Retriever

documents = ["bệnh đái tháo đường", "cảm cúm và ho", "stress và chứng lo âu"]
preprocessor = TextPreprocessor()

# TF-IDF
tfidf = TFIDFRetriever()
tfidf.fit(preprocessor.batch_preprocess(documents))
tfidf_results = tfidf.retrieve("đái tháo", top_k=2)

# BM25
bm25 = BM25Retriever()
bm25.fit(preprocessor.batch_preprocess(documents), tokenizer=preprocessor.tokenize)
bm25_results = bm25.retrieve("đái tháo", top_k=2, tokenizer=preprocessor.tokenize)

print("TF-IDF Results:", tfidf_results)
print("BM25 Results:", bm25_results)
```

---

## 🧮 Các Công thức Toán học

### 1. TF-IDF

**Term Frequency (TF):**

```
TF(t, d) = (Số lần từ t xuất hiện trong tài liệu d) / (Tổng số từ trong tài liệu d)
```

**Inverse Document Frequency (IDF):**

```
IDF(t) = log(Tổng số tài liệu / Số tài liệu chứa từ t)
```

**TF-IDF:**

```
TF-IDF(t, d) = TF(t, d) * IDF(t)
```

**Cosine Similarity:**

```
Cosine(A, B) = (A · B) / (||A|| * ||B||)

Với:
- A, B: vector
- A · B: tích vô hướng
- ||A||, ||B||: chuẩn (norm) của vector
```

### 2. BM25

**Công thức đầy đủ:**

```
BM25(D, Q) = Σ IDF(qi) * ((k1 + 1) * f(qi, D)) /
             (f(qi, D) + k1 * (1 - b + b * (|D| / avgdl)))

Với:
- D: tài liệu
- Q: câu hỏi
- qi: từ thứ i trong Q
- f(qi, D): tần suất từ qi trong tài liệu D
- |D|: độ dài tài liệu D
- avgdl: độ dài trung bình tất cả tài liệu
- k1, b: tham số điều chỉnh
- IDF(qi) = log((N - n(qi) + 0.5) / (n(qi) + 0.5) + 1)
  * N: tổng số tài liệu
  * n(qi): số tài liệu chứa qi
```

---

## ⚙️ Các Tham số Khuyến nghị

### TextPreprocessor

```python
# Mặc định (tốt cho hầu hết trường hợp)
preprocessor = TextPreprocessor(
    remove_stopwords=True,
    use_stemming=True
)

# Nếu muốn giữ tất cả từ
preprocessor = TextPreprocessor(
    remove_stopwords=False,
    use_stemming=False
)
```

### TFIDFRetriever

```python
# Mặc định
retriever = TFIDFRetriever(
    max_features=5000,
    ngram_range=(1, 2)
)

# Để tăng tốc độ, giảm từ vựng
retriever = TFIDFRetriever(
    max_features=2000,
    ngram_range=(1, 1)  # Chỉ 1-gram
)

# Để tăng chính xác, tăng từ vựng
retriever = TFIDFRetriever(
    max_features=10000,
    ngram_range=(1, 3)  # Bao gồm 3-gram
)
```

### BM25Retriever

```python
# Mặc định (cân bằng)
retriever = BM25Retriever(k1=1.5, b=0.75)

# Tăng ảnh hưởng của tần suất từ
retriever = BM25Retriever(k1=2.0, b=0.75)

# Giảm ảnh hưởng của độ dài tài liệu
retriever = BM25Retriever(k1=1.5, b=0.5)
```

### HybridRetriever

```python
# Cân bằng (50-50)
retriever = HybridRetriever(tfidf_weight=0.5, bm25_weight=0.5)

# Ưu tiên BM25 (thường tốt hơn)
retriever = HybridRetriever(tfidf_weight=0.3, bm25_weight=0.7)

# Ưu tiên TF-IDF
retriever = HybridRetriever(tfidf_weight=0.7, bm25_weight=0.3)
```

---

## 🔄 Quy trình Hoạt động Toàn bộ

```
User Input (Câu hỏi)
    ↓
[TextPreprocessor.preprocess()]
    ├─ Làm sạch (remove URL, email)
    ├─ Chuyển thành chữ thường
    ├─ Tokenize (chia từ)
    └─ Loại bỏ stopwords
    ↓
[Query Vector]
    ↓
[TFIDFRetriever] ─────┐
    ├─ Tính TF-IDF    │
    └─ Cosine Sim ────┤
                      ├─→ [HybridRetriever]
[BM25Retriever] ─────┤    ├─ Kết hợp scores
    ├─ Tính BM25      │    └─ Sắp xếp kết quả
    └─ Tính BM25 ─────┘
    ↓
[Top-k Documents]
    ↓
[Return to User]
```

---

## 📊 So sánh TF-IDF vs BM25

| Tiêu chí                 | TF-IDF          | BM25          |
| ------------------------ | --------------- | ------------- |
| **Độ chính xác**         | Trung bình      | Cao hơn       |
| **Tốc độ**               | Nhanh           | Chậm hơn      |
| **Độ phức tạp**          | Đơn giản        | Phức tạp hơn  |
| **Chuẩn hóa độ dài doc** | Không           | Có            |
| **Tuning**               | Ít              | Nhiều (k1, b) |
| **Khuyến dùng**          | Nhanh prototype | Production    |

---

## 🛠️ Troubleshooting

### Vấn đề 1: Warning về underthesea

```
Warning: underthesea not installed. Vietnamese tokenization may not be optimal.
```

**Giải pháp:**

```bash
pip install underthesea
```

### Vấn đề 2: Kết quả truy xuất không tốt

**Giải pháp:**

1. Kiểm tra dữ liệu đầu vào (có sạch không?)
2. Thay đổi `top_k` (tìm kiếm nhiều hơn)
3. Điều chỉnh trọng số trong HybridRetriever
4. Thay đổi tham số k1, b trong BM25

### Vấn đề 3: Tốc độ chậm

**Giải pháp:**

1. Giảm `max_features` trong TFIDFRetriever
2. Giảm `top_k`
3. Giảm số lượng tài liệu
4. Sử dụng cache cho kết quả đã tính

---

## 📚 Tài liệu Tham khảo

### Lý thuyết

- TF-IDF: https://en.wikipedia.org/wiki/Tf%E2%80%93idf
- BM25: https://en.wikipedia.org/wiki/Okapi_BM25
- Cosine Similarity: https://en.wikipedia.org/wiki/Cosine_similarity

### Thư viện

- scikit-learn: https://scikit-learn.org/
- underthesea: https://github.com/undertheseanlp/underthesea
- scipy: https://scipy.org/

---

## 🎓 Kết luận

File `model1_preprocess.py` cung cấp các công cụ toàn diện cho:

1. **Xử lý văn bản** tiếng Việt chuyên sâu
2. **Truy xuất tài liệu** sử dụng TF-IDF
3. **Truy xuất tài liệu** sử dụng BM25
4. **Kết hợp cả hai** để kết quả tối ưu

Với module này, bạn có thể xây dựng một hệ thống truy xuất thông tin y tế hiệu quả và chính xác.

---

**Phiên bản:** 1.0  
**Ngày tạo:** May 2, 2026  
**Ngôn ngữ:** Python 3.7+
