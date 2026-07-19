import { simpleMarkdownToHtml } from "@/lib/markdown";

type CanonicalDocumentEditor = {
  commands: {
    setContent: (content: string) => unknown;
  };
};

export function replaceCanonicalDocument(
  editor: CanonicalDocumentEditor,
  markdown: string,
) {
  editor.commands.setContent(simpleMarkdownToHtml(markdown));
}
