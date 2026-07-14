export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
      {Icon && (
        <div className="rounded-full bg-base-200 p-3.5 text-base-content/40">
          <Icon size={26} strokeWidth={1.75} />
        </div>
      )}
      <div>
        <p className="font-display font-semibold text-base-content">{title}</p>
        {description && <p className="text-sm text-base-content/50 mt-1 max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
