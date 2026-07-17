//
//  leanring_buddyTests.swift
//  leanring-buddyTests
//
//  Created by thorfinn on 3/2/26.
//

import Testing
import CoreGraphics
@testable import leanring_buddy

struct leanring_buddyTests {

    @Test func firstPermissionRequestUsesSystemPromptOnly() async throws {
        let presentationDestination = WindowPositionManager.permissionRequestPresentationDestination(
            hasPermissionNow: false,
            hasAttemptedSystemPrompt: false
        )

        #expect(presentationDestination == .systemPrompt)
    }

    @Test func repeatedPermissionRequestOpensSystemSettings() async throws {
        let presentationDestination = WindowPositionManager.permissionRequestPresentationDestination(
            hasPermissionNow: false,
            hasAttemptedSystemPrompt: true
        )

        #expect(presentationDestination == .systemSettings)
    }

    @Test func knownGrantedScreenRecordingPermissionSkipsTheGate() async throws {
        let shouldTreatPermissionAsGranted = WindowPositionManager.shouldTreatScreenRecordingPermissionAsGrantedForSessionLaunch(
            hasScreenRecordingPermissionNow: false,
            hasPreviouslyConfirmedScreenRecordingPermission: true
        )

        #expect(shouldTreatPermissionAsGranted)
    }

    @Test func pointParserAcceptsWellFormedCoordinateTag() async throws {
        let result = CompanionManager.parsePointingCoordinates(
            from: "点这里。[POINT:1263,94:三点菜单]"
        )

        #expect(result.spokenText == "点这里。")
        #expect(result.coordinate == CGPoint(x: 1263, y: 94))
        #expect(result.elementLabel == "三点菜单")
    }

    @Test func pointParserAcceptsMissingClosingBracketFromMiniMax() async throws {
        let result = CompanionManager.parsePointingCoordinates(
            from: "点这里。[POINT:1263,94:三点菜单"
        )

        #expect(result.spokenText == "点这里。")
        #expect(result.coordinate == CGPoint(x: 1263, y: 94))
        #expect(result.elementLabel == "三点菜单")
    }

    @Test func ordinaryKnowledgeQuestionDoesNotRequestPointing() async throws {
        #expect(!PointingRequestPolicy.shouldRequestPointing(
            for: "Codex 最近更新了哪些功能？"
        ))
    }

    @Test func copyableContentRequestDoesNotRequestPointing() async throws {
        #expect(!PointingRequestPolicy.shouldRequestPointing(
            for: "帮我写一段读取 JSON 的 Swift 代码"
        ))
    }

    @Test func ordinaryQuestionAboutVisibleUIControlsDoesNotRequestPointing() async throws {
        #expect(!PointingRequestPolicy.shouldRequestPointing(
            for: "这个按钮为什么不能用？"
        ))
    }

    @Test func nonVisualSearchDoesNotRequestPointing() async throws {
        #expect(!PointingRequestPolicy.shouldRequestPointing(
            for: "帮我找一下最近的 Codex 新闻"
        ))
    }

    @Test func abstractProblemLocationDoesNotRequestPointing() async throws {
        #expect(!PointingRequestPolicy.shouldRequestPointing(
            for: "帮我定位这个 bug 的原因"
        ))
    }

    @Test func explicitDesktopSearchRequestsPointing() async throws {
        #expect(PointingRequestPolicy.shouldRequestPointing(
            for: "帮我找一下桌面上的 Mavis 文件夹"
        ))
    }

    @Test func explicitLocationQuestionRequestsPointing() async throws {
        #expect(PointingRequestPolicy.shouldRequestPointing(
            for: "Chrome 浏览器在哪儿？"
        ))
    }

}
