cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "1.7.317,6e3ebc5"
  sha256 arm: "ff64a0817d5f1fcfa6abf193359400b352d5c90ac58715a81cfb2a6955256c3b",
         intel: "8e0dc776ad33b021671f109d8c0d6129e63704817b0c86d58d75f2571feb3730"
  url "https://github.com/eachann1024/goose-note/releases/download/v#{version.csv.first}-#{version.csv.second}/Goose.Note-#{version.csv.first}#{arch}.dmg"
  name "Thinkly"
  desc "Thinkly: Keep every passing thought. Ask your past anytime."
  homepage "https://github.com/eachann1024/goose-note"
  depends_on :macos
  app "Goose Note.app"
  zap trash: [
    "~/Library/Application Support/Goose Note",
    "~/Library/Logs/Goose Note",
    "~/Library/Preferences/com.goosenote.desktop.plist",
    "~/Library/Saved Application State/com.goosenote.desktop.savedState",
  ]
  caveats <<~EOS
    Thinkly has no Developer ID signature or Apple notarization.
    The independent author has not enrolled in Apple's paid developer program.
    Try opening the app, then allow it in System Settings → Privacy & Security.
    Homebrew installs the app only; it does not install the DMG's command helper.
    For the trusted official app, a manual fallback in Terminal is:
      sudo xattr -r -s -d com.apple.quarantine "/Applications/Goose Note.app"
    Guide: https://github.com/eachann1024/goose-note/blob/main/docs/macos-installation.md
  EOS
end
