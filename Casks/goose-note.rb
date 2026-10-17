cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "1.7.316,8e35835"
  sha256 arm: "27728745a103ecee5b6c0e66eeb637298d2d2075746c3d02ff25cf1fcae72c00",
         intel: "eac147bebf6bb350e4a7628f502a6cb8b87ac2f40e9d855c07b000d90b9d7ec2"
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
