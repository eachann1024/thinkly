cask "thinkly" do
  arch arm: "-arm64", intel: ""
  version "1.7.327,5e69701"
  sha256 arm: "7f763daf07883238a2238beb3978cdb4dd2ff5c3dc189f0e0933afb15c3b6f6b",
         intel: "caa3efa422194fbc9b86cdf504f8a60ee07bccf36b3b30f7c978e3f4e77f9849"
  url "https://github.com/eachann1024/thinkly/releases/download/v#{version.csv.first}-#{version.csv.second}/Thinkly-#{version.csv.first}#{arch}.dmg"
  name "Thinkly"
  desc "Thinkly: Keep every passing thought. Ask your past anytime."
  homepage "https://github.com/eachann1024/thinkly"
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
