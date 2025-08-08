#!/usr/bin/env python3
"""
ArkTS LSP 功能测试工具
支持测试：定义查找、引用查找、签名帮助

使用方法：
python arkts_lsp_test.py --test definition --file /path/to/file.ets --line 20 --character 28
python arkts_lsp_test.py --test references --file /path/to/file.ets --line 21 --character 5
python arkts_lsp_test.py --test signature --file /path/to/file.ets --line 33 --character 25
"""

import requests
import json
import argparse
import sys
from typing import Dict, Any, Optional


class ArkTSLSPTester:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json'
        })

    def test_definition(self, file_path: str, line: int, character: int) -> Dict[str, Any]:
        """测试定义查找功能"""
        print(f"🔍 测试定义查找: {file_path}:{line}:{character}")
        
        payload = {
            "uri": f"file://{file_path}",
            "line": line,
            "character": character
        }
        
        try:
            response = self.session.post(f"{self.base_url}/definition", json=payload)
            response.raise_for_status()
            result = response.json()
            
            print(f"✅ 定义查找成功 (状态码: {response.status_code})")
            if result and isinstance(result, list) and len(result) > 0:
                print(f"📋 找到 {len(result)} 个定义:")
                for i, definition in enumerate(result):
                    print(f"  {i+1}. {definition.get('uri', 'N/A')}")
                    print(f"     范围: {definition.get('range', {})}")
            else:
                print("⚠️  未找到定义")
            
            return {"success": True, "data": result, "status_code": response.status_code}
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 定义查找失败: {e}")
            return {"success": False, "error": str(e)}

    def test_references(self, file_path: str, line: int, character: int, include_declaration: bool = True) -> Dict[str, Any]:
        """测试引用查找功能"""
        print(f"🔍 测试引用查找: {file_path}:{line}:{character} (包含声明: {include_declaration})")
        
        payload = {
            "uri": f"file://{file_path}",
            "line": line,
            "character": character,
            "includeDeclaration": include_declaration
        }
        
        try:
            response = self.session.post(f"{self.base_url}/references", json=payload)
            response.raise_for_status()
            result = response.json()
            
            print(f"✅ 引用查找成功 (状态码: {response.status_code})")
            if result and isinstance(result, list) and len(result) > 0:
                print(f"📋 找到 {len(result)} 个引用:")
                for i, reference in enumerate(result):
                    print(f"  {i+1}. {reference.get('uri', 'N/A')}")
                    print(f"     范围: {reference.get('range', {})}")
            else:
                print("⚠️  未找到引用")
            
            return {"success": True, "data": result, "status_code": response.status_code}
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 引用查找失败: {e}")
            return {"success": False, "error": str(e)}

    def test_signature_help(self, file_path: str, line: int, character: int) -> Dict[str, Any]:
        """测试签名帮助功能"""
        print(f"🔍 测试签名帮助: {file_path}:{line}:{character}")
        
        payload = {
            "uri": f"file://{file_path}",
            "line": line,
            "character": character
        }
        
        try:
            response = self.session.post(f"{self.base_url}/signature", json=payload)
            response.raise_for_status()
            result = response.json()
            
            print(f"✅ 签名帮助成功 (状态码: {response.status_code})")
            if result and isinstance(result, dict):
                signatures = result.get('signatures', [])
                if signatures:
                    print(f"📋 找到 {len(signatures)} 个签名:")
                    for i, sig in enumerate(signatures):
                        print(f"  {i+1}. {sig.get('label', 'N/A')}")
                        if sig.get('documentation'):
                            print(f"     文档: {sig.get('documentation')}")
                        if sig.get('parameters'):
                            print(f"     参数: {len(sig.get('parameters', []))} 个")
                else:
                    print("⚠️  未找到签名信息")
            else:
                print("⚠️  未找到签名信息")
            
            return {"success": True, "data": result, "status_code": response.status_code}
            
        except requests.exceptions.RequestException as e:
            print(f"❌ 签名帮助失败: {e}")
            return {"success": False, "error": str(e)}

    def test_all(self, file_path: str, line: int, character: int) -> Dict[str, Any]:
        """测试所有功能"""
        print("🚀 开始测试所有 ArkTS LSP 功能")
        print("=" * 50)
        
        results = {}
        
        # 测试定义查找
        results['definition'] = self.test_definition(file_path, line, character)
        print()
        
        # 测试引用查找
        results['references'] = self.test_references(file_path, line, character)
        print()
        
        # 测试签名帮助
        results['signature'] = self.test_signature_help(file_path, line, character)
        print()
        
        # 汇总结果
        print("📊 测试结果汇总:")
        print("=" * 50)
        success_count = sum(1 for r in results.values() if r.get('success', False))
        total_count = len(results)
        print(f"✅ 成功: {success_count}/{total_count}")
        
        for test_name, result in results.items():
            status = "✅" if result.get('success', False) else "❌"
            print(f"{status} {test_name}: {'成功' if result.get('success', False) else '失败'}")
        
        return results


def main():
    parser = argparse.ArgumentParser(description="ArkTS LSP 功能测试工具")
    parser.add_argument("--test", choices=["definition", "references", "signature", "all"], 
                       default="all", help="测试类型")
    parser.add_argument("--file", required=True, help="要测试的 .ets 文件路径")
    parser.add_argument("--line", type=int, required=True, help="行号 (从0开始)")
    parser.add_argument("--character", type=int, required=True, help="字符位置 (从0开始)")
    parser.add_argument("--url", default="http://localhost:3000", help="LSP HTTP 服务器地址")
    parser.add_argument("--include-declaration", action="store_true", 
                       help="引用查找时是否包含声明 (仅对 references 测试有效)")
    
    args = parser.parse_args()
    
    # 验证文件存在
    import os
    if not os.path.exists(args.file):
        print(f"❌ 文件不存在: {args.file}")
        sys.exit(1)
    
    # 创建测试器
    tester = ArkTSLSPTester(args.url)
    
    # 执行测试
    if args.test == "definition":
        result = tester.test_definition(args.file, args.line, args.character)
    elif args.test == "references":
        result = tester.test_references(args.file, args.line, args.character, args.include_declaration)
    elif args.test == "signature":
        result = tester.test_signature_help(args.file, args.line, args.character)
    elif args.test == "all":
        result = tester.test_all(args.file, args.line, args.character)
    else:
        print(f"❌ 未知的测试类型: {args.test}")
        sys.exit(1)
    
    # 返回结果
    if isinstance(result, dict) and not result.get('success', False):
        sys.exit(1)


if __name__ == "__main__":
    main() 