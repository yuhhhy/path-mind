interface StreamingOutputBlockProps {
  content: string | undefined;
  placeholder: string;
  maxHeightClassName?: string;
}

export function StreamingOutputBlock({
  content,
  maxHeightClassName = 'max-h-72',
  placeholder,
}: StreamingOutputBlockProps) {
  return (
    <pre
      className={`${maxHeightClassName} overflow-auto rounded-md bg-gray-50 p-3 text-xs leading-5 text-gray-500 whitespace-pre-wrap`}
    >
      {content || placeholder}
    </pre>
  );
}
