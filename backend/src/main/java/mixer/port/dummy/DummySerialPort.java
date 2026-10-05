package mixer.port.dummy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import mixer.port.PortAdapter;

public class DummySerialPort implements PortAdapter {

	private static final Logger log = LoggerFactory.getLogger(DummySerialPort.class);

	private boolean open;
	private String portName;
	
	public DummySerialPort(String portName) {
		this.portName = portName;
	}
	
	@Override
	public boolean open() {
		if (open) throw new IllegalStateException();
		open = true;
		return open;
	}

	@Override
	public void close() {
		if (!open) throw new IllegalStateException();
		open = false;
	}

	public void write(byte[] data) {
		if (!open) throw new IllegalStateException();
		StringBuilder hex = new StringBuilder();
		for (byte b : data) {
			hex.append(String.format("0x%02X ", b));
		}
		log.debug("SIMULIERT – COM-Port '{}': Bytes gesendet: {}", portName, hex.toString().trim());
	}

	@Override
	public boolean isOpen() {
		return open;
	}

	@Override
	public String getPortName() {
		return portName;
	}

	@Override
	public void start() {
	    write(new byte[]{(byte)0xA0, 0x01, 0x01, (byte)0xA2});
	}

	@Override
	public void stop() {
	    write(new byte[]{(byte)0xA0, 0x01, 0x00, (byte)0xA1});
	}
	
}
