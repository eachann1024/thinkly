#!/usr/bin/env swift
import AppKit
import Foundation

enum FileIconError: Error, CustomStringConvertible {
    case invalidArguments
    case unreadableIcon(String)
    case missingTarget(String)
    case failedToSetIcon(String)

    var description: String {
        switch self {
        case .invalidArguments:
            return "Usage: set-file-icon.swift <iconPath> <targetPath>"
        case .unreadableIcon(let path):
            return "Cannot load icon image: \(path)"
        case .missingTarget(let path):
            return "Icon target does not exist: \(path)"
        case .failedToSetIcon(let path):
            return "Cannot set custom file icon: \(path)"
        }
    }
}

guard CommandLine.arguments.count == 3 else {
    throw FileIconError.invalidArguments
}
let iconPath = URL(fileURLWithPath: CommandLine.arguments[1]).standardizedFileURL.path
let targetPath = URL(fileURLWithPath: CommandLine.arguments[2]).standardizedFileURL.path
guard let icon = NSImage(contentsOfFile: iconPath) else {
    throw FileIconError.unreadableIcon(iconPath)
}
guard FileManager.default.fileExists(atPath: targetPath) else {
    throw FileIconError.missingTarget(targetPath)
}

guard NSWorkspace.shared.setIcon(icon, forFile: targetPath, options: []) else {
    throw FileIconError.failedToSetIcon(targetPath)
}
