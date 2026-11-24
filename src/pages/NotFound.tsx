import { useNavigate } from "react-router-dom";
import { Home, Search } from "lucide-react";
import { Seo } from "@/components/Seo";
import { FunState } from "@/components/sc/FunState";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <>
      <Seo title="Page not found | SportCliq" description="This page is out of bounds." url={window.location.href} image={undefined} children={<meta name="robots" content="noindex" />} />
      <FunState
        kind="lost"
        badge="404"
        title="That ball went out of play"
        body="The page you want has moved or never existed. Let's get you back in the game."
        primary={{ label: "Back to home", onClick: () => navigate("/"), icon: Home }}
        secondary={{ label: "Search SportCliq", onClick: () => navigate("/search"), icon: Search }}
      />
    </>
  );
}
