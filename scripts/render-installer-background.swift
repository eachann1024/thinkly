#!/usr/bin/env swift
import AppKit

let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let assets = root.appendingPathComponent("electron/installer")
guard let artwork = NSImage(contentsOf: assets.appendingPathComponent("artwork.png")) else {
    fatalError("Missing installer artwork")
}
let ink = NSColor(srgbRed: 0.13, green: 0.27, blue: 0.21, alpha: 1)

for scale in [1, 2] {
    let width = 960 * scale, height = 640 * scale
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
        let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Cannot create bitmap") }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    context.cgContext.scaleBy(x: CGFloat(scale), y: CGFloat(scale))
    artwork.draw(in: NSRect(x: 0, y: 0, width: 960, height: 640))

    func text(_ value: String, top: CGFloat, size: CGFloat, centered: Bool = true, serif: Bool = false) {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = centered ? .center : .left
        let font = serif ? (NSFont(name: "Songti SC Bold", size: size) ?? NSFont.systemFont(ofSize: size, weight: .semibold))
                         : NSFont.systemFont(ofSize: size, weight: .medium)
        let string = NSAttributedString(string: value, attributes: [.font: font, .foregroundColor: ink, .paragraphStyle: paragraph])
        let bounds = NSRect(x: centered ? 36 : 54, y: 640 - top - size * 1.5, width: centered ? 888 : 600, height: size * 1.5)
        string.draw(in: bounds)
    }
    text("思绪", top: 44, size: 46, centered: false, serif: true)
    text("Thinkly", top: 101, size: 27, centered: false, serif: true)
    text("01  拖入应用程序", top: 174, size: 24)
    text("02  双击下方「安装指令」，按提示输入密码", top: 370, size: 23)
    text("（暂未加入每年 99 美元的 Apple 开发者计划 🥺 首次打开请手动授权）", top: 414, size: 15)

    let arrow = NSBezierPath()
    arrow.move(to: NSPoint(x: 410, y: 370))
    arrow.curve(to: NSPoint(x: 550, y: 370), controlPoint1: NSPoint(x: 455, y: 378), controlPoint2: NSPoint(x: 505, y: 374))
    arrow.move(to: NSPoint(x: 536, y: 382)); arrow.line(to: NSPoint(x: 550, y: 370)); arrow.line(to: NSPoint(x: 536, y: 358))
    ink.setStroke(); arrow.lineWidth = 2.5; arrow.lineCapStyle = .round; arrow.stroke()
    NSGraphicsContext.restoreGraphicsState()
    bitmap.size = NSSize(width: 960, height: 640)
    guard let data = bitmap.representation(using: .png, properties: [:]) else { fatalError("Cannot encode PNG") }
    try data.write(to: assets.appendingPathComponent(scale == 1 ? "background.png" : "background-2x.png"))
}
let tiff = Process()
tiff.executableURL = URL(fileURLWithPath: "/usr/bin/tiffutil")
tiff.arguments = ["-cathidpicheck", assets.appendingPathComponent("background.png").path,
    assets.appendingPathComponent("background-2x.png").path, "-out", assets.appendingPathComponent("background.tiff").path]
try tiff.run(); tiff.waitUntilExit()
guard tiff.terminationStatus == 0 else { fatalError("Cannot create multi-resolution TIFF") }
print("Rendered 1x + 2x installer backgrounds and multi-resolution TIFF")
