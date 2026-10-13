import { useStoreSettings } from '@/hooks/useStoreSettings';

// Help, order tracking and contact links are in the header's utility row (desktop) and the mobile menu.
// The text is the announcement set in Admin > Settings, or the free-shipping line.
export default function TopBar() {
  const { announcement } = useStoreSettings();
  return (
    <div className="bg-brand-black text-white py-1.5">
      <div className="container-custom">
        <p className="text-xs font-medium tracking-wide uppercase text-center">{announcement}</p>
      </div>
    </div>
  );
}
