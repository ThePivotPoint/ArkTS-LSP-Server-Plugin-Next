# ArkTS LSP 测试工具

这是一个Python测试工具，用于测试ArkTS LSP的三个核心功能：定义查找、引用查找和签名帮助。

## 安装依赖

```bash
pip install -r requirements.txt
```

## 使用方法

### 1. 测试定义查找

```bash
python arkts_lsp_test.py --test definition --file /path/to/file.ets --line 20 --character 28
```

### 2. 测试引用查找

```bash
python arkts_lsp_test.py --test references --file /path/to/file.ets --line 21 --character 5
```

### 3. 测试签名帮助

```bash
python arkts_lsp_test.py --test signature --file /path/to/file.ets --line 33 --character 25
```

### 4. 测试所有功能

```bash
python arkts_lsp_test.py --test all --file /path/to/file.ets --line 20 --character 28
```

## 参数说明

- `--test`: 测试类型 (definition/references/signature/all)
- `--file`: 要测试的 .ets 文件路径
- `--line`: 行号 (从0开始)
- `--character`: 字符位置 (从0开始)
- `--url`: LSP HTTP 服务器地址 (默认: http://localhost:3000)
- `--include-declaration`: 引用查找时是否包含声明

## 示例

### 测试类名定义
```bash
python arkts_lsp_test.py --test definition \
  --file /Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets \
  --line 20 --character 28
```

### 测试方法引用
```bash
python arkts_lsp_test.py --test references \
  --file /Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets \
  --line 21 --character 5 --include-declaration
```

### 测试函数签名
```bash
python arkts_lsp_test.py --test signature \
  --file /Users/feiyu/Desktop/arkts-projects/applications_app_samples/code/UI/ExpandTitle/entry/src/main/ets/entryability/EntryAbility.ets \
  --line 33 --character 25
```

## 输出说明

- ✅ 成功: 请求成功且返回有效数据
- ⚠️ 未找到: 请求成功但返回空结果
- ❌ 失败: 请求失败或网络错误

## 注意事项

1. 确保VSCode扩展已安装并启用
2. 确保HTTP服务器在3000端口运行
3. 文件路径必须是绝对路径
4. 行号和字符位置从0开始计算 