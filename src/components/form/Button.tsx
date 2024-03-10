export default function Button({
  children,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  className = "",
  isLoading = false,
  href = "",
  download = "",
  iconButton = false,
  ...props
}: {
  children: string | any;
  variant?: "primary" | "outlined" | "none";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  isLoading?: boolean;
  href?: any;
  download?: string;
  iconButton?: boolean;
}) {
  const isDisabled = disabled || isLoading;

  const StyledButton = () => (
    <button
      {...props}
      disabled={isDisabled}
      className={
        `${className} ` +
        "flex items-center justify-center py-2 px-4 rounded text-white " +
        (fullWidth ? "w-full " : "") +
        (isDisabled
          ? " bg-grey !text-gray-500 border border-primary cursor-not-allowed "
          : variant === "outlined"
          ? "bg-transparent hover:bg-primary !text-primary font-semibold hover:!text-white border border-primary hover:border-transparent"
          : variant === "none"
          ? `bg-transparent hover:bg-primary text-primary font-semibold hover:text-white `
          : iconButton
          ? "hover:bg-grey rounded-full w-8 h-8"
          : `bg-primary hover:bg-secondary text-white font-bold shadow`)
      }
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full mr-2 h-4 w-4 bg-gradient-to-r from-grey to-primary"></div>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );

  return href ? (
    <a href={href} download={download} className={fullWidth ? "w-full" : ""}>
      <StyledButton />
    </a>
  ) : (
    <StyledButton />
  );
}
