export type BottomToTopModeState = 'initializing' | 'lockedBottom'

export class BottomToTopStateMachine {
    private state: BottomToTopModeState = 'initializing'

    get current(): BottomToTopModeState {
        return this.state
    }

    enterInitializing(): BottomToTopModeState {
        this.state = 'initializing'
        return this.state
    }

    enterLockedBottom(): BottomToTopModeState {
        this.state = 'lockedBottom'
        return this.state
    }
}
