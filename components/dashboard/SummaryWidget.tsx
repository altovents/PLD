type Color = "red" | "green" | "blue";

interface SummaryWidgetProps {
  label: string;
  value: string;
  sublabel: string;
  color: Color;
}

const COLOR_MAP: Record<Color, string> = {
  red: "bg-red-50 border-red-100",
  green: "bg-green-50 border-green-100",
  blue: "bg-blue-50 border-blue-100",
};

const VALUE_COLOR: Record<Color, string> = {
  red: "text-red-700",
  green: "text-green-700",
  blue: "text-blue-700",
};

export default function SummaryWidget({ label, value, sublabel, color }: SummaryWidgetProps) {
  return (
    <div className={`rounded-2xl border-2 p-6 ${COLOR_MAP[color]}`}>
      <p className="text-sm text-gray-500 font-medium mb-2">{label}</p>
      <p className={`text-2xl font-bold ${VALUE_COLOR[color]} mb-1`}>{value}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
    </div>
  );
}
