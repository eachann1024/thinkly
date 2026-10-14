cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "1.7.189,9f98be7"
  sha256 arm: "e736d1ae2ce3c999dfe297231d3798fdeaabae89dbff4aec7a3298321f7f976c",
         intel: "bb045e84d80ce4330f09cff17d3bcff918f30c3b5b796553e38f40a1c4fe3c03"
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
