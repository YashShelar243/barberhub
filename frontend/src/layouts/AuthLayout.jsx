function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export default AuthLayout;
