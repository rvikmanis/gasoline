import { interfaces } from "gasoline";
import React from "react";
import { focusByIndex } from "../helpers";

interface Props {
    onChange?: React.FormEventHandler<any>;
    onKeyDown?: React.KeyboardEventHandler<any>;
    value?: string;
    placeholder?: string;
    index: string;
}

export default class TextInput extends React.Component<Props> {
    inputNode: HTMLInputElement

    componentDidMount() {
        if (focusByIndex.isPending(this.props.index)) {
            this.inputNode.focus()
            focusByIndex.clearPending()
        }
    }

    onRef = (input: HTMLInputElement) => { 
        this.inputNode = input
    }

    render() {
        const { index, ...rest } = this.props
        return <input
            ref={this.onRef}
            type="text"
            className="text-input"
            data-index={index}
            {...rest}
        />
    }
}