type CheckboxProps = {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
};

const Checkbox = ({ label, checked, onChange, id }: CheckboxProps) => {
  return (
    <label htmlFor={id} className="inline-flex items-center select-none text-sm cursor-default">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
      />
      {label && <span className="ml-2">{label}</span>}
    </label>
  );
};

export default Checkbox;
