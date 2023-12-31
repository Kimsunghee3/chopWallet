import { Category } from "@components/Category"
import { NFTSearch } from "@components/Search"
import { NavLink } from "react-router-dom"

const NetWorkPageList = [{ NetWorkSub: "Mumbai" }, { NetWorkSub: "Arbitrum" }, { NetWorkSub: "Polygon" }]

export const NetWorkPage = () => {
    return (
        <>
            {NetWorkPageList.map((menu, index) => (
                <NavLink to={menu.NetWorkSub} key={index}>
                    <Category category={menu.NetWorkSub} />
                </NavLink>
            ))}
        </>
    )
}
