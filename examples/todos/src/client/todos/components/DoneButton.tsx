import { interfaces } from "gasoline";
import React from "react";

interface Props {
    onClick?: React.MouseEventHandler<any>;
    value?: boolean;
}

export default function DoneButton({ onClick, value = false }: Props) {
    const className = `done-button state--${value ? "on" : "off"}`
    return <button className={className} onClick={onClick}></button>
}