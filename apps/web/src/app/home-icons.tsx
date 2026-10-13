/** Ikon bulat Home: SVG inline, tanpa dependensi. */

/** Ikon profil (Portal/Masuk/Daftar, ditunda): tampil tetapi tidak aktif. */
export function ProfileIconBadge() {
  return (
    <button
      type="button"
      disabled
      aria-label="Profil"
      aria-disabled="true"
      className="grid size-11 cursor-default place-items-center rounded-full border-2 border-[#3b2a12] bg-[#d9402e]"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="#f7e9c4">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.2 3.6-7 8-7s8 2.8 8 7v1H4z" />
      </svg>
    </button>
  );
}

/** Isi tombol pengaturan (roda gigi). Bulatan kuning ada di tautannya. */
export function SettingsGearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6" fill="#3b2a12">
      <path
        fillRule="evenodd"
        d="M10.3 2h3.4l.5 2.4c.6.2 1.1.5 1.6.9l2.3-.8 1.7 2.9-1.8 1.6c.1.6.1 1.2 0 1.8l1.8 1.6-1.7 2.9-2.3-.8c-.5.4-1 .7-1.6.9l-.5 2.4h-3.4l-.5-2.4c-.6-.2-1.1-.5-1.6-.9l-2.3.8-1.7-2.9 1.8-1.6c-.1-.6-.1-1.2 0-1.8L4.2 7.4l1.7-2.9 2.3.8c.5-.4 1-.7 1.6-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
        transform="translate(0 1.5) scale(1 .95)"
      />
    </svg>
  );
}
