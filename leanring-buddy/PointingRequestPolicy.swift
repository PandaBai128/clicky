//
//  PointingRequestPolicy.swift
//  leanring-buddy
//

import Foundation

enum PointingRequestPolicy {
    /// Pointing is intentionally opt-in. Screen content and assistant wording
    /// must never make an ordinary question move the cursor.
    nonisolated static func shouldRequestPointing(for transcript: String) -> Bool {
        let normalizedTranscript = transcript
            .lowercased()
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !normalizedTranscript.isEmpty else { return false }

        let explicitPointingPhrases = [
            "指给我看", "给我指", "帮我指", "指一下",
            "点哪里", "点击哪里", "点哪个", "点击哪个",
            "应该点", "该点",
            "point to", "show me where", "where should i click",
            "which button", "which icon"
        ]

        if explicitPointingPhrases.contains(where: { normalizedTranscript.contains($0) }) {
            return true
        }

        let visibleTargetWords = [
            "按钮", "图标", "菜单", "文件", "文件夹", "桌面", "窗口",
            "应用", "软件", "浏览器", "输入框", "选项", "设置",
            "button", "icon", "menu", "file", "folder", "desktop", "window",
            "app", "application", "browser", "field", "tab", "toolbar", "settings"
        ]
        let visibleSearchOrLocationPhrases = [
            "帮我定位", "给我定位", "定位一下",
            "帮我找", "给我找", "找一下", "找出", "找找",
            "在哪儿", "在哪里", "在哪",
            "locate", "help me find", "find the", "where is", "where's"
        ]

        return visibleSearchOrLocationPhrases.contains {
            normalizedTranscript.contains($0)
        } && visibleTargetWords.contains {
            normalizedTranscript.contains($0)
        }
    }
}
