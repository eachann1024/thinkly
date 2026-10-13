cask "goose-note" do
  arch arm: "-arm64", intel: ""
  version "1.7.189,e8ae8b3"
  sha256 arm: "f1251bbd0e4f681f5614778cf38abf1c5cd8f18be513d452454e18bb274e1ba2",
         intel: "732e3e7e6b7befb8a76f1b8c8c85bb05ce3a7da6ad274b12e8421b30a1d24352"
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
