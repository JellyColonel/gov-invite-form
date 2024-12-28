class ColorUtils {
  // Convert HEX color to decimal
  static hexToDecimal(hex) {
    // Remove # if present
    hex = hex.replace("#", "");

    // Convert 3-digit HEX to 6-digit
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    // Validate HEX format
    if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
      console.error("Invalid HEX color format:", hex);
      return null;
    }

    // Convert to decimal
    return parseInt(hex, 16);
  }
}
