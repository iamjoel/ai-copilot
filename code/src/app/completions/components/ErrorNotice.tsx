const ErrorNotice = ({ message }: { message: string }) => (
  <p className="rounded-lg border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm text-red-100">
    {message}
  </p>
);

export default ErrorNotice;
