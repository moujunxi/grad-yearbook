import themes from '../config/themes';

export default function EntryCard({ entry }) {
  const theme = themes.find((t) => t.key === entry.bg_theme) || themes[0];

  return (
    <div className="max-w-sm mx-auto rounded-2xl shadow-lg overflow-hidden" style={theme.css}>
      <div className="bg-white/20 backdrop-blur-sm p-6 flex flex-col items-center">
        {entry.avatar_path ? (
          <img src={`/${entry.avatar_path}`} alt={entry.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-white/70 mb-4" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-white/40 flex items-center justify-center text-4xl mb-4">
            📷
          </div>
        )}
        <h2 className="text-xl font-bold text-white drop-shadow">{entry.name}</h2>
        {entry.label && (
          <span className="mt-1 px-3 py-0.5 bg-white/30 rounded-full text-sm text-white">{entry.label}</span>
        )}
        {entry.motto && <p className="mt-3 text-white/90 italic text-center">"{entry.motto}"</p>}
        {entry.class_name && <p className="mt-2 text-white/70 text-sm">{entry.class_name}</p>}
      </div>
    </div>
  );
}
