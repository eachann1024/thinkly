import { customAudioBlock } from "../blocks/audioBlock";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core/blocks";
import { gooseTableBlockSpec } from "../blocks/table/gooseTableBlockSpec";
import { gooseHeadingBlockSpec } from "@/components/editor/blocks/heading/headingBlockSpec";
import { calloutBlock } from "@/components/editor/blocks/callout/calloutBlock";
import { customFileBlock } from "../blocks/file/customFileBlock";
import { customImageBlock } from "../blocks/image/customImageBlock";
import { customVideoBlock } from "../blocks/video/videoBlock";
import { codeBlockSpec } from "@/components/editor/blocks/code/codeBlockSpec";
import { gooseEditorStyleSpecs } from "@/components/editor/inline-code/InlineCodeComponent";
import { pageMentionSpec } from "@/components/editor/inline/pageMentionSpec";
import { gooseToggleListItemBlockSpec } from "../blocks/toggle/toggleListItemBlockSpec";

import { columnLayoutBlockSpec, columnSectionBlockSpec } from "../blocks/columns/columnBlockSpecs";

export const editorSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    // 普通 heading 保留 section 折叠；显式 toggle heading/list 使用真实 children。
    heading: gooseHeadingBlockSpec,
    table: gooseTableBlockSpec,
    toggleListItem: gooseToggleListItemBlockSpec,
    columnLayout: columnLayoutBlockSpec,
    columnSection: columnSectionBlockSpec,
    callout: calloutBlock,
    image: customImageBlock,
    video: customVideoBlock,
    audio: customAudioBlock,
    file: customFileBlock,
    codeBlock: codeBlockSpec,
  },
  styleSpecs: gooseEditorStyleSpecs,
}).extend({
  inlineContentSpecs: {
    pageMention: pageMentionSpec,
  },
});
