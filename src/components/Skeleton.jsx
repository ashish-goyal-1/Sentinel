const Skeleton = ({ className = '', variant = 'rect' }) => {
    const baseClasses = 'skeleton animate-pulse';

    const variants = {
        rect: 'rounded-lg',
        circle: 'rounded-full',
        text: 'rounded h-4',
        title: 'rounded h-6 w-3/4',
        card: 'rounded-2xl',
    };

    return (
        <div className={`${baseClasses} ${variants[variant]} ${className}`} />
    );
};

// Pre-built skeleton components
export const CardSkeleton = () => (
    <div className="glass-card p-6 space-y-4">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
        </div>
    </div>
);

export const StatCardSkeleton = () => (
    <div className="glass-card p-6">
        <div className="flex items-center gap-4">
            <Skeleton variant="circle" className="w-12 h-12" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
            </div>
        </div>
    </div>
);

export const TableRowSkeleton = () => (
    <div className="flex items-center gap-4 p-4 border-b border-zinc-800">
        <Skeleton variant="circle" className="w-10 h-10" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-20" />
    </div>
);

export const ExamCardSkeleton = () => (
    <div className="glass-card p-6 space-y-4">
        <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton variant="circle" className="w-10 h-10" />
        </div>
        <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
        </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExamCardSkeleton />
            <ExamCardSkeleton />
            <ExamCardSkeleton />
        </div>
    </div>
);

export default Skeleton;
