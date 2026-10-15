cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "1.7.232,4828ad4"
  sha256 arm: "b0c4f692d7bc6e4318dccd19a47a381ed8ca6ea7818764c2ba9bc262f84e0deb",
         intel: "44eb92a9047ee8bad5b2b7a745a30c3ffdd6755b581095ef03b11c4f6f2e0993"
  url "https://github.com/eachann1024/goose-notes/releases/download/v#{version.csv.first}-#{version.csv.second}/Goose.Note-#{version.csv.first}#{arch}.dmg"
  name "Goose Note"
  desc "Local-first Markdown notes with AI"
  homepage "https://github.com/eachann1024/goose-notes"
  depends_on :macos
  app "Goose Note.app"
  zap trash: [
    "~/Library/Application Support/Goose Note",
    "~/Library/Logs/Goose Note",
    "~/Library/Preferences/com.goosenote.desktop.plist",
    "~/Library/Saved Application State/com.goosenote.desktop.savedState",
  ]
  caveats <<~EOS
    Goose Note is currently unsigned and not notarized.
    After installing, allow it in System Settings → Privacy & Security.
    If needed, run: xattr -cr "/Applications/Goose Note.app"
  EOS
end
