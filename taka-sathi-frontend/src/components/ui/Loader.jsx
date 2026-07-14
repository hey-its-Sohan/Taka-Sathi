export default function Loader({ label = 'Loading…', fullscreen = false }) {
  const content = (
    <div className="flex flex-col items-center gap-3 py-10">
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="text-sm text-base-content/50">{label}</p>
    </div>
  );

  if (fullscreen) {
    return <div className="min-h-screen flex items-center justify-center bg-base-200">{content}</div>;
  }
  return content;
}
