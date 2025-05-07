// components/Checkbox.tsx
type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
  id: string;
};

const Checkbox = ({ label, checked, onChange, id }: CheckboxProps) => {
  return (
    <label htmlFor={id} className="inline-flex items-center select-none text-sm cursor-default">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-default"
      />
      <span className="ml-2">{label}</span>
    </label>
  );
};

export default Checkbox;
