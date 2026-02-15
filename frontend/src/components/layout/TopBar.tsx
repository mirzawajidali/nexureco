export default function TopBar() {
  return (
    <div className="bg-brand-black text-white py-2">
      <div className="container-custom flex items-center justify-between">
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <a href="/page/help" className="hover:underline">Help</a>
          <a href="/track-order" className="hover:underline">Track Order</a>
        </div>
        <p className="text-xs font-medium tracking-wide text-center flex-1 sm:flex-none">
          FREE SHIPPING ON ORDERS OVER RS. 5,000
        </p>
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <a href="/page/about" className="hover:underline">About Us</a>
          <a href="/contact" className="hover:underline">Contact</a>
        </div>
      </div>
    </div>
  );
}
