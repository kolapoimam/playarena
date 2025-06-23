import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";

const sports = [
	{
		name: "Football",
		emoji: "⚽",
		active: true,
		route: "/matches",
	},
	{
		name: "Cycling",
		emoji: "🚴",
		active: true,
		route: "/cycling-activities",
	},
	{
		name: "Basketball",
		emoji: "🏀",
		active: false,
	},
	{
		name: "Volleyball",
		emoji: "🏐",
		active: false,
	},
	{
		name: "Tennis",
		emoji: "🎾",
		active: false,
	},
	{
		name: "Running",
		emoji: "🏃",
		active: false,
	},
	{
		name: "Ping Pong",
		emoji: "🏓",
		active: false,
	},
	{
		name: "Walking",
		emoji: "🚶",
		active: false,
	},
];

const Activities = () => {
	const navigate = useNavigate();

	const handleCardClick = (sport: typeof sports[0]) => {
		if (sport.active) {
			navigate(sport.route);
		}
	};

	return (
		<>
			<Seo
				title="Activities | PlayArena"
				description="Explore and join a variety of sports activities including football, cycling, basketball, and more on PlayArena."
				url={window.location.href}
				image={undefined}
				children={null}
			/>
			<div className="min-h-screen bg-background text-foreground">
				<header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
					<div className="flex items-center justify-between">
						<Button
							variant="ghost"
							onClick={() => navigate(-1)}
							className="text-white hover:bg-green-600"
						>
							<ArrowLeft size={18} className="mr-2" />
							Back
						</Button>
						<div className="text-center">
							<h1 className="text-2xl font-bold">Activities</h1>
						</div>
						<div className="w-10"></div>
					</div>
				</header>

				<div className="px-4 py-4 pb-32">
					<div className="grid grid-cols-2 gap-4">
						{sports.map((sport, index) => (
							<div
								key={sport.name}
								onClick={() => handleCardClick(sport)}
								className={`
                p-6 rounded-xl cursor-pointer transition-all duration-300
                ${
									sport.active
										? "bg-green-500 hover:bg-green-600"
										: "bg-gray-200 dark:bg-gray-700/90 hover:bg-gray-300 dark:hover:bg-gray-600/90"
								}
              `}
							>
								<div className="flex flex-col items-center text-center">
									<div className="text-4xl mb-2">{sport.emoji}</div>
									<h3 className="text-xl font-semibold">{sport.name}</h3>
									{!sport.active && (
										<div className="mt-2 text-sm text-gray-400 dark:text-gray-500">
											Coming Soon
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>

				<Navbar />
			</div>
		</>
	);
};

export default Activities;
