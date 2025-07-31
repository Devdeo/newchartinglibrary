import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useRef } from "react";
import TradingChart from "../components/TradingChart";
import styles from "../styles/Home.module.css";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>TradingView Clone</title>
        <meta name="description" content="Advanced Trading Chart with D3.js" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>TradingView Clone</h1>
        <TradingChart />
      </main>
    </div>
  );
};

export default Home;