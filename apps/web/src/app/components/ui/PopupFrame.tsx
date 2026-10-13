import type { ReactNode, Ref } from "react";

export type PopupFrameProps = {
  /** Label aksesibel dialog; juga judul tampil bila `heading` tidak diisi. */
  title: string;
  /** Teks judul yang tampil bila berbeda dari label aksesibel. */
  heading?: string;
  /** Konten di atas judul (mis. catatan privasi dan chip kategori). */
  header?: ReactNode;
  children: ReactNode;
  /** Dialog modal (aria-modal) untuk bottom sheet. */
  modal?: boolean;
  /** Ref judul, supaya fokus bisa dipindah saat dibuka. */
  titleRef?: Ref<HTMLHeadingElement>;
  className?: string;
  /** Mis. menahan klik agar tidak menutup latar. */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

/**
 * Bingkai popup bersama: map kuning dengan klip kertas. Dipakai popup Detail Heksa, Ganti Bulan,
 * Event Tanggal, Ajakan, Fase Pembalikan, dan nanti Hasil Akhir. Penataan posisi lewat `className`.
 */
export default function PopupFrame({
  title,
  heading,
  header,
  children,
  modal = false,
  titleRef,
  className = "",
  onClick,
}: PopupFrameProps) {
  return (
    <section
      role="dialog"
      aria-modal={modal ? true : undefined}
      aria-label={title}
      className={`ui-folder ui-popup ${className}`}
      onClick={onClick}
    >
      <span aria-hidden="true" className="ui-clip" />
      <div className="ui-popup-scroll">
        {header}
        <h2 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="ui-popup-title focus:outline-none">
          {heading ?? title}
        </h2>
        <div className="ui-popup-body">{children}</div>
      </div>
    </section>
  );
}
