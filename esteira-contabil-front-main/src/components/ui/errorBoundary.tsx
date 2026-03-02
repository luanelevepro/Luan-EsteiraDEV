import React, { Component, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
	title?: string;
	children: React.ReactNode;
}

interface ErrorBoundaryState {
	error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { error: undefined };
	}

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('[ErrorBoundary]', error, info);
	}

	render() {
		if (!this.state.error) return this.props.children;

		return (
			<div className='rounded-2xl border border-red-200 bg-white p-6 shadow-sm'>
				<div className='mb-2 text-xs font-black tracking-widest text-red-600 uppercase'>{this.props.title || 'Erro ao renderizar'}</div>
				<div className='mb-2 text-sm font-black text-gray-900'>{this.state.error.message}</div>
				<pre className='max-h-[45vh] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-[11px] whitespace-pre-wrap text-gray-600'>
					{this.state.error.stack}
				</pre>
			</div>
		);
	}
}
