import React, { type ReactNode } from "react";

interface CardProps {
    children: ReactNode;
}

const AdminCard: React.FC<CardProps> = ({ children }) =>  {
    return (
        <div className="p-3">
            {children}
        </div>
    )
}

export default AdminCard