let _pendingFocusByIndex: string | void
let _focusTimeout: number | void;

function focusByIndex(index: string | number) {
    const input = document.querySelector(
        `input[data-index="${index}"]`
    ) as HTMLInputElement

    if (input == null) {
        return focusByIndex.onMount(index)
    }

    focusByIndex.clearPending()
    input.focus()
}

namespace focusByIndex {
    export function isPending(index: string | number) {
        return _pendingFocusByIndex === String(index)
    }

    export function clearPending() {
        if (_focusTimeout) {
            _focusTimeout = clearTimeout(_focusTimeout)
        }
        _pendingFocusByIndex = undefined
    }

    export function onMount(index: string | number) {
        clearPending()
        _pendingFocusByIndex = String(index)
        _focusTimeout = <any>setTimeout(clearPending, 100) as number
    }
}

export { focusByIndex }