import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export type ListItem = {
  id: string;
  content: React.ReactNode;
  onClick?: () => void;
};

export type ListProps = {
  title?: string;
  items: ListItem[];
};

const List: React.FC<ListProps> = ({ title, items }) => {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-semibold px-2">{title}</h2>}
      <div className="grid gap-2">
        {items.map((item) => (
          <Card
            key={item.id}
            onClick={item.onClick}
            className={`cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <CardContent className="p-4">
              {item.content}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default List;

