cask "thinkly" do
  version "1.7.338,3d383d4"
  sha256 "2fd6425e630465f5e32cbd895e45f6bae99a83d4a0b973e189ec3a55a17a75db"
  url "https://github.com/eachann1024/thinkly/releases/download/v#{version.csv.first}-#{version.csv.second}/Thinkly-#{version.csv.first}-arm64.dmg"
  name "Thinkly"
  desc "Thinkly: Keep every passing thought. Ask your past anytime."
  homepage "https://github.com/eachann1024/thinkly"
  depends_on arch: :arm64
  depends_on :macos
  app "Thinkly.app"
  zap trash: [
    "~/Library/Application Support/Thinkly",
    "~/Library/Application Support/Goose Note",
    "~/Library/Logs/Thinkly",
    "~/Library/Logs/Goose Note",
    "~/Library/Preferences/com.thinkly.desktop.plist",
    "~/Library/Preferences/com.goosenote.desktop.plist",
    "~/Library/Saved Application State/com.thinkly.desktop.savedState",
    "~/Library/Saved Application State/com.goosenote.desktop.savedState",
  ]
  caveats <<~EOS
    Thinkly has no Developer ID signature or Apple notarization.
    The independent author has not enrolled in Apple's paid developer program.
    Try opening the app, then allow it in System Settings → Privacy & Security.
    Homebrew installs the app only; it does not install the DMG's command helper.
    For the trusted official app, a manual fallback in Terminal is:
      sudo xattr -r -s -d com.apple.quarantine "/Applications/Thinkly.app"
    Guide: https://github.com/eachann1024/thinkly/blob/main/docs/macos-installation.md
  EOS
end
