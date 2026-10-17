import { createTranslator } from "../i18n/core";
import messages from "./git-messages.yaml";
export const gitText = createTranslator(messages);
export const gitMessages = messages;
export const isGitMessage = (message: string) => Object.values(messages.en).includes(message) || Object.values(messages["zh-Hans"]).includes(message);
