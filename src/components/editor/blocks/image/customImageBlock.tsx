import * as GooseIcons from "@/components/ui/icons";
import { createImageBlockConfig, imageParse } from "@blocknote/core";
import {
  createReactBlockSpec,
  useUploadLoading,
  ResizableFileBlockWrapper,
} from "@blocknote/react";
import {
  MediaLoadingPreview,
  MediaPlaceholder,
} from "@/components/editor/blocks/shared/MediaPlaceholder";
import {
  imageBlockWithoutGeneratedCaption,
  normalizeParsedImageProps,
} from "./imageCaption";
import { ResolvedImagePreview } from "./ResolvedImagePreview";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/blocks/image/customImageBlock.tsx#messages:1">`
zh-Hans:
  addImage: "添加图片"
  clickToChooseOrDragIntoTheEditor: "点击选择，或直接拖入编辑器"
en:
  addImage: "Add image"
  clickToChooseOrDragIntoTheEditor: "Click to choose or drag into the editor"
`;
const t = createTranslator(messages);


function CustomImageBlockContent({
  block,
  editor,
}: {
  block: any;
  editor: any;
}) {
  useLocale();
  const showLoader = useUploadLoading(block.id);

  if (showLoader) {
    return <MediaLoadingPreview />;
  }

  if (!block.props.url) {
    return (
      <MediaPlaceholder
        variant="image"
        blockId={block.id}
        editor={editor}
        title={t("addImage")}
        hint={t("clickToChooseOrDragIntoTheEditor")}
        icon={<GooseIcons.Image size={22} strokeWidth={1.75} />}
      />
    );
  }

  const displayBlock = imageBlockWithoutGeneratedCaption(block);

  return (
    <ResizableFileBlockWrapper block={displayBlock} editor={editor}>
      <ResolvedImagePreview block={displayBlock} editor={editor} />
    </ResizableFileBlockWrapper>
  );
}

const imageConfig = createImageBlockConfig({});
export const customImageBlock = createReactBlockSpec(
  { ...imageConfig, propSchema: {
    ...imageConfig.propSchema,
    alt: { default: undefined, type: "string" as const },
    captionSource: { default: "" },
  } },
  {
    meta: {
      fileBlockAccept: ["image/*"],
    },
    render: (props) => (
      <CustomImageBlockContent block={props.block} editor={props.editor} />
    ),
    parse: (element) => {
      const parsed = imageParse()(element);
      if (!parsed) return undefined;
      const image = element.tagName === "IMG" ? element : element.querySelector("img");
      return normalizeParsedImageProps({ ...parsed,
        ...(image?.hasAttribute("alt") ? { alt: image.getAttribute("alt") ?? "" } : {}),
        ...(image?.hasAttribute("data-goose-image-name") ? { name: image.getAttribute("data-goose-image-name") ?? "" } : {}),
        ...(element.hasAttribute("data-caption-source") ? { captionSource: element.getAttribute("data-caption-source") } : {}),
      });
    },
    toExternalHTML: ({ block }) => {
      const props = imageBlockWithoutGeneratedCaption(block).props;
      if (props.showPreview === false) {
        const link = <a href={props.url}>{props.name || props.url}</a>;
        return props.caption ? <div data-caption-source={props.captionSource}>{link}<p>{props.caption}</p></div> : link;
      }
      const image = <img src={props.url} alt={typeof props.alt === "string" ? props.alt : props.name}
        data-goose-image-name={props.name} width={props.previewWidth} />;
      return props.caption ? <figure data-caption-source={props.captionSource}>{image}<figcaption>{props.caption}</figcaption></figure> : image;
    },
    runsBefore: ["file"],
  },
)();
