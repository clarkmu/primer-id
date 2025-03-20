export default function PageDescription({
  title,
  description,
  files,
  results,
  extra,
}: {
  title: string;
  description: string;
  files?: string;
  results?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2" data-cy="pageDescription">
      <div className="text-lg font-bold text-center mb-2">{title}</div>
      <div>
        <b>DESCRIPTION</b> {description}
      </div>
      {files && (
        <div>
          <b>FILES</b> {files}
        </div>
      )}
      {results && (
        <div>
          <b>RESULTS</b> {results}
        </div>
      )}
      {extra && <div>{extra}</div>}
    </div>
  );
}
