import messages from "./things.yaml";
import { createTranslator } from "@/i18n";
const t = createTranslator(messages);
const names = ["GraduationCap", "Brain", "Lightbulb", "Calculator", "Clock", "Timer", "AlarmClock", "Compass", "Puzzle", "BriefcaseBusiness", "Briefcase", "ShoppingCart", "WalletCards", "PartyPopper", "Highlighter", "Pencil", "Printer", "Settings", "Handshake", "Microscope", "FlaskConical", "School", "Ruler", "DraftingCompass", "Telescope", "Users", "UserRound", "Laptop", "Wrench", "Hammer", "Package", "Truck", "Landmark", "Factory", "Building2", "Store", "Home", "Coffee", "Utensils", "CookingPot", "CakeSlice", "Dumbbell", "Bike", "Plane", "TrainFront", "Car", "Ship", "Camera", "Headphones", "Film", "Gamepad2", "Palette", "Flower2", "Gift", "Baby", "TentTree", "Mountain", "Earth", "BedDouble", "Shirt", "ShoppingBag", "MicVocal", "Volleyball", "Fish", "Bird"] as const;
export const things = {
  id: "things" as const,
  get label() { return t("category"); },
  icons: names.map((name) => ({ name, get label() { return t(name); }, get keywords() { return t(`${name}Keywords`); } })),
};
