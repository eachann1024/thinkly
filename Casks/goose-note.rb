cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "1.7.240,ed8d329"
  sha256 arm: "a0c3edf52efec3faaa74d77fb9d0580e0ab00050a44c7015736ace36c5264e7d",
         intel: "f645445567acc5bf3f1cec2721f0de21ed66c3e475148fc1a588b5ca5689f814"
  url "https://github.com/eachann1024/goose-note/releases/download/v#{version.csv.first}-#{version.csv.second}/Goose.Note-#{version.csv.first}#{arch}.dmg"
  name "Goose Note"
  desc "Local-first Markdown notes with AI"
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
    Goose Note has no Developer ID signature or Apple notarization.
    The independent author has not enrolled in Apple's paid developer program.
    Try opening the app, then allow it in System Settings → Privacy & Security.
    Homebrew installs the app only; it does not install the DMG's command helper.
    For the trusted official app, a manual fallback in Terminal is:
      sudo xattr -r -s -d com.apple.quarantine "/Applications/Goose Note.app"
    Guide: https://github.com/eachann1024/goose-note/blob/main/docs/macos-installation.md
  EOS
end
