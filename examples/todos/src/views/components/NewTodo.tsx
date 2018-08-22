import * as React from "react";
import "./NewTodo.css";

export default class NewTodo extends React.Component {
  state = { text: "" };

  props: {
    onSubmitText: (text: string) => void;
  };

  onChange = (e) => {
    this.setState({ text: e.target.value })
  };

  onKeyDown = (e) => {
    if (e.key === "Enter") {
      const text = this.state.text.trim();
      this.setState({ text: "" });
      if (text !== "") {
        this.props.onSubmitText(text);
      }
    }
  }

  render() {
    return <div className="NewTodo">
      <input
        type="text"
        value={this.state.text}
        onChange={this.onChange}
        onKeyDown={this.onKeyDown}
      />
    </div>
  }
}