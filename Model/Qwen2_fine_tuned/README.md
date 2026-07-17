# Model 2 — Qwen2.5-1.5B-Instruct Fine-tuning bằng QLoRA

## 1. Tổng quan

`fine_tuning.ipynb` là Model 2 của hệ thống chatbot y tế tiếng Việt. Đây là mô hình sinh câu trả lời dựa trên fine-tuning, không phải retriever: mô hình nhận câu hỏi người dùng, tạo phản hồi theo ngữ cảnh hội thoại đã học, rồi trả lời trực tiếp.

Mô hình nền là [`Qwen/Qwen2.5-1.5B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) và được fine-tune bằng **QLoRA** để giảm yêu cầu bộ nhớ GPU trong khi vẫn giữ khả năng thích nghi với dữ liệu y tế tiếng Việt.

Luồng xử lý:

```text
Câu hỏi người dùng
	↓
Tiền xử lý dữ liệu / tokenize
	↓
Huấn luyện Qwen2.5-1.5B-Instruct bằng QLoRA
	↓
Sinh phản hồi chatbot
	↓
Hiển thị kết quả qua notebook hoặc Gradio
```

Model **có sinh câu trả lời mới** dựa trên trọng số đã fine-tune, khác với baseline truy xuất câu hỏi–trả lời.

## 2. Các thành phần hỗ trợ

| Thành phần | Mô tả | Khi nên dùng |
| --- | --- | --- |
| `preprocessing_model2_finetune.ipynb` | Chuẩn bị dữ liệu train/validation, tokenize và lưu tokenizer. | Khi cần dựng lại toàn bộ pipeline dữ liệu. |
| `fine_tuning.ipynb` | Huấn luyện mô hình bằng QLoRA, đánh giá và chạy thử chatbot. | Khi muốn fine-tune hoặc kiểm tra kết quả huấn luyện. |
| `mode.ipynb` | Notebook bổ trợ cho biến thể chạy mô hình / thử nghiệm. | Khi cần tham khảo thêm luồng thực nghiệm khác. |
| `Gradio` | Giao diện chat demo để thử model sau huấn luyện. | Khi muốn kiểm tra mô hình bằng giao diện người dùng. |

## 3. Dữ liệu và tiền xử lý

Dự án sử dụng các tập dữ liệu và artifacts đã lưu cục bộ:

| Thư mục | Vai trò |
| --- | --- |
| `medical_data_train/` | Dữ liệu train đã được chuẩn bị và lưu sẵn. |
| `medical_data_val/` | Dữ liệu validation đã được chuẩn bị và lưu sẵn. |
| `medical_tokenized_data/` | Dữ liệu sau khi tokenize. |
| `medical_tokenizer/` | Tokenizer đã lưu sau tiền xử lý. |

Trong notebook tiền xử lý, tokenizer được lưu bằng `tokenizer.save_pretrained("medical_tokenizer")`. Nếu cần tái tạo dữ liệu, hãy chạy lại notebook tiền xử lý trước khi huấn luyện.

## 4. Kiến trúc huấn luyện

| Thành phần | Vai trò |
| --- | --- |
| `Qwen/Qwen2.5-1.5B-Instruct` | Mô hình nền để fine-tune. |
| `QLoRA` | Kỹ thuật fine-tuning 4-bit giúp giảm chi phí VRAM. |
| `Transformers` | Tải mô hình, tokenizer và chạy sinh văn bản. |
| `PEFT` | Gắn LoRA adapter vào mô hình nền. |
| `TRL` | Cung cấp `SFTTrainer` cho supervised fine-tuning. |
| `BitsAndBytes` | Hỗ trợ lượng tử hóa 4-bit. |
| `Gradio` | Tạo giao diện chat thử nghiệm. |

Khi chạy notebook huấn luyện, mô hình thường lưu adapter cuối tại `medical_chatbot_final_adapter/` hoặc một đường dẫn tương đương trên Drive tùy cấu hình notebook.

## 5. Cài đặt

Yêu cầu Python 3.10+ và GPU hỗ trợ CUDA để huấn luyện thuận lợi hơn.

Các thư viện chính:

```bash
pip install -U transformers datasets peft trl bitsandbytes accelerate matplotlib gradio
```

Nếu bạn chạy trên Colab hoặc môi trường tương tự, hãy đảm bảo đã gắn Google Drive trước khi lưu model hoặc dữ liệu ra Drive.

## 6. Chạy bằng notebook

### Lần chạy đầu

1. Mở `preprocessing_model2_finetune.ipynb`.
2. Chạy toàn bộ notebook để tạo dữ liệu train/validation, tokenize và lưu tokenizer.
3. Mở `fine_tuning.ipynb`.
4. Chạy các cell theo thứ tự để tải mô hình nền, cấu hình QLoRA, huấn luyện và lưu adapter.

### Chạy thử chatbot

Sau khi huấn luyện, chạy phần demo trong `fine_tuning.ipynb` để kiểm tra phản hồi của chatbot. Nếu notebook đã bật Gradio, bạn có thể mở giao diện chat trực tiếp từ link được tạo ra khi chạy.

### Tái sử dụng artifacts đã lưu

Nếu dữ liệu và tokenizer đã có sẵn, bạn chỉ cần chạy notebook huấn luyện mà không cần làm lại toàn bộ tiền xử lý. Điều này giúp tiết kiệm thời gian khi thử nghiệm lại cấu hình huấn luyện.

## 7. Các tham số quan trọng

| Tham số | Giá trị phổ biến | Ý nghĩa |
| --- | --- | --- |
| `model_id` | `Qwen/Qwen2.5-1.5B-Instruct` | Mô hình nền dùng để fine-tune. |
| `output_dir` | `./medical_chatbot_results` | Thư mục lưu kết quả huấn luyện trung gian. |
| `push_to_hub` | `False` | Không đẩy mô hình lên Hugging Face Hub trong notebook mặc định. |
| `dataset_text_field` | `text` | Cột văn bản đầu vào cho SFTTrainer. |

## 8. Dùng như một notebook module

Dự án hiện được tổ chức theo notebook, nên cách dùng chính là mở và chạy từng cell. Nếu bạn muốn chuyển sang script Python, luồng logic cần giữ nguyên là:

```text
load tokenizer/data → cấu hình 4-bit quantization → gắn LoRA adapter → train → save adapter → chat demo
```

## 9. Artifacts được tạo

Tùy notebook và môi trường chạy, các artifacts thường gồm:

| Thư mục / tệp | Nội dung |
| --- | --- |
| `medical_data_train/` | Dữ liệu train đã lưu. |
| `medical_data_val/` | Dữ liệu validation đã lưu. |
| `medical_tokenized_data/` | Dữ liệu đã tokenize. |
| `medical_tokenizer/` | Tokenizer đã fit và lưu lại. |
| `medical_chatbot_final_adapter/` | Adapter cuối sau fine-tuning, nếu notebook lưu ra thư mục cục bộ. |

## 10. Cấu trúc chính trong workspace

```text
preprocessing_model2_finetune.ipynb  # tiền xử lý dữ liệu, tokenize, lưu tokenizer
fine_tuning.ipynb                    # huấn luyện QLoRA, đánh giá, chạy demo chat
```

## 11. Khắc phục lỗi thường gặp

### Thiếu thư viện

```text
ModuleNotFoundError: No module named 'transformers'
```

Cài lại các thư viện ở mục 5, đặc biệt là `transformers`, `peft`, `trl`, `bitsandbytes` và `gradio`.

### Không đủ VRAM

Nếu gặp lỗi bộ nhớ GPU khi load mô hình, hãy kiểm tra lại cấu hình 4-bit, batch size, max sequence length và gradient accumulation trong notebook huấn luyện.

### Không lưu được model

Nếu notebook báo lỗi khi lưu adapter, hãy kiểm tra đường dẫn output và quyền ghi file, đặc biệt khi chạy trên Drive hoặc môi trường cloud.

### Chất lượng câu trả lời chưa tốt

- Kiểm tra dữ liệu tiền xử lý có đồng nhất với luồng huấn luyện hay không.
- Thử điều chỉnh cấu hình QLoRA, batch size và learning rate.
- Đánh giá lại chất lượng tập dữ liệu tiếng Việt trước khi fine-tune.
